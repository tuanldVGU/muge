import './index.css';
import { KeyboardShortcuts, MidiNumbers } from 'react-piano';
import 'react-piano/dist/styles.css';

import SoundfontProvider from './SoundfontProvider';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlay } from '@fortawesome/free-solid-svg-icons'
import { faStop } from '@fortawesome/free-solid-svg-icons'
import { faRotateLeft } from '@fortawesome/free-solid-svg-icons'

import {PianoWithRecording} from './PianoWithRecording'
import { useRef, useState } from 'react';
import _ from 'lodash';

function App() {
  const firstNote = MidiNumbers.fromNote('c3');
  const lastNote = MidiNumbers.fromNote('f5');
  const keyboardShortcuts = KeyboardShortcuts.create({
    firstNote: firstNote,
    lastNote: lastNote,
    keyboardConfig: KeyboardShortcuts.HOME_ROW,
  });

  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const soundfontHostname = 'https://d1pzp51pvbm36p.cloudfront.net';

  const DEFAULT_RECORD = {
    recording: {
      mode: 'RECORDING',
      events: [],
      currentTime: 0,
      currentEvents: [],
    }
  }

  const scheduledEvents = useRef([])
  const [record, setRecord] = useState(DEFAULT_RECORD)

  const getRecordingEndTime = () => {
    return record.recording.events.length === 0 ? 0: Math.max(
      ...record.recording.events.map(event => event.time + event.duration),
    )
  }

  const setRecording = value => {
    setRecord({
      recording: Object.assign({}, record.recording, value),
    });
  };

  const onClickPlay = () => {
    setRecording({
      mode: 'PLAYING'
    });
    const startAndEndTimes = _.uniq(
      _.flatMap(record.recording.events, event => [
        event.time,
        event.time + event.duration,
      ]),
    );
    startAndEndTimes.forEach(time => {
      scheduledEvents.current.push(
        setTimeout(() => {
          const currentEvents = record.recording.events.filter(event => {
            return event.time <= time && event.time + event.duration > time;
          });
          setRecording({
            currentEvents,
          });
        }, time * 1000),
      );
    });
    // Stop at the end
    setTimeout(() => {
      onClickStop()
    }, getRecordingEndTime() * 1000);
  };

  const onClickStop = () => {
    scheduledEvents.current.forEach(scheduledEvent => {
      clearTimeout(scheduledEvent);
    });
    setRecording({
      mode: 'RECORDING',
      currentEvents: [],
    });
  };

  const onClickClear = () => {
    onClickStop();
    setRecording({
      events: [],
      mode: 'RECORDING',
      currentEvents: [],
      currentTime: 0,
    });
  };

  return (
    <div className='piano_wrapper'>
      <div className='piano'>
        <SoundfontProvider
        instrumentName="acoustic_grand_piano"
        audioContext={audioContext}
        hostname={soundfontHostname}
        render={({ isLoading, playNote, stopNote }) => (
         <PianoWithRecording record={record} setRecord={setRecord}
           noteRange={{ first: firstNote, last: lastNote }}
           playNote={playNote}
           stopNote={stopNote}
           disabled={isLoading}
           width={600}
           keyboardShortcuts={keyboardShortcuts}
         />
        )}>
        </SoundfontProvider>
      </div>
      <div className='btn_group'>
          <button type='button' onClick={e => onClickPlay()}><FontAwesomeIcon icon={faPlay}/></button>
          <button type='button' onClick={e => onClickStop()} className={record.recording.mode == 'PLAYING' ? 'active' : ''}><FontAwesomeIcon icon={faStop}/></button>
          <button type='button' onClick={e => onClickClear()}><FontAwesomeIcon icon={faRotateLeft}/></button>
      </div>
      <div className="mt-5">
        <strong>Recorded notes</strong>
        <div>{JSON.stringify(record.recording.events)}</div>
      </div>
    </div>
  );
}

export default App;
