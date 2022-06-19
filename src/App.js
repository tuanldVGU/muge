import './index.css';
import { KeyboardShortcuts, MidiNumbers } from 'react-piano';
import 'react-piano/dist/styles.css';

import SoundfontProvider from './SoundfontProvider';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlay } from '@fortawesome/free-solid-svg-icons'
import { faStop } from '@fortawesome/free-solid-svg-icons'
import { faCircleArrowDown } from '@fortawesome/free-solid-svg-icons'
import { faRotateLeft } from '@fortawesome/free-solid-svg-icons'
import { faCloudBolt } from '@fortawesome/free-solid-svg-icons';

import {PianoWithRecording} from './PianoWithRecording'

import React from 'react'

import _ from 'lodash';

import { Midi } from '@tonejs/midi'
import axios from 'axios';

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
  },
  loading: false
}

class App extends React.Component {
  state = DEFAULT_RECORD;

  constructor(props) {
    super(props);

    this.scheduledEvents = [];
  }

  getRecordingEndTime = () => {
    if (this.state.recording.events.length === 0) {
      return 0;
    }
    return Math.max(
      ...this.state.recording.events.map(event => event.time + event.duration),
    );
  };

  setRecording = value => {
    this.setState({
      recording: Object.assign({}, this.state.recording, value),
      loading: this.state.loading
    });
  };

  onClickPlay = () => {
    this.setRecording({
      mode: 'PLAYING',
    });
    const startAndEndTimes = _.uniq(
      _.flatMap(this.state.recording.events, event => [
        event.time,
        event.time + event.duration,
      ]),
    );
    startAndEndTimes.forEach(time => {
      this.scheduledEvents.push(
        setTimeout(() => {
          const currentEvents = this.state.recording.events.filter(event => {
            return event.time <= time && event.time + event.duration > time;
          });
          this.setRecording({
            currentEvents,
          });
        }, time * 1000),
      );
    });
    // Stop at the end
    setTimeout(() => {
      this.onClickStop();
    }, this.getRecordingEndTime() * 1000);
  };

  onClickStop = () => {
    this.scheduledEvents.forEach(scheduledEvent => {
      clearTimeout(scheduledEvent);
    });
    this.setRecording({
      mode: 'RECORDING',
      currentEvents: [],
    });
  };

  onClickClear = () => {
    this.onClickStop();
    this.setRecording({
      events: [],
      mode: 'RECORDING',
      currentEvents: [],
      currentTime: 0,
    });
  };

  onCreate = () => {
    const midi = new Midi()
    const track = midi.addTrack()
    this.state.recording.events.forEach(x =>{
      track.addNote({
        midi : x.midiNumber,
        time : x.time,
        duration: x.duration
      })
    })
    const link=document.createElement('a');
    link.href=window.URL.createObjectURL(new Blob([midi.toArray()]))
    link.download="output.mid";
    link.click();
  }

  onGenerate = () => {
    this.setState({
     ...this.state,
     loading: true
    });
    const data = {
      pitch: {},
      start: {},
      end: {},
      step: {},
      duration: {}
    }
    let prev = 0
    this.state.recording.events.forEach((x,i) => {
      data.pitch[`${i}`] = x.midiNumber
      data.start[`${i}`] = x.time
      data.end[`${i}`] = x.time + x.duration
      data.step[`${i}`] =  x.time - prev
      data.duration[`${i}`] = x.duration
      prev =  x.time
    })

    const url = "https://run-model.azurewebsites.net"

    axios.post(url,data,{
      headers:{
        'Access-Control-Allow-Origin': '*'
      }
    }).then(res => {
      const midi = new Midi()
      const track = midi.addTrack()
      let prev = 0
      Object.keys(res.data.pitch).forEach(x =>{
        prev = prev + res.data.step[x]
        track.addNote({
          midi : res.data.pitch[x],
          time : res.data.start[x],
          duration: res.data.duration[x],
          velocity: 1,
          noteOffVelocity: 100
        })
      })
      midi.velocity = 100
      const link=document.createElement('a');
      link.href=window.URL.createObjectURL(new Blob([midi.toArray()]))
      link.download="output.mid";
      link.click();
    }).finally(()=>{
      this.setState({
        ...this.state,
        loading: false
       });
    })
  }

  render() {
    return(
      <div className='piano_wrapper'>
        <div className='piano'>
          <SoundfontProvider
          instrumentName="acoustic_grand_piano"
          audioContext={audioContext}
          hostname={soundfontHostname}
          render={({ isLoading, playNote, stopNote }) => (
          <PianoWithRecording record={this.state} setRecord={this.setRecording}
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
            <button type='button' onClick={e => this.onClickPlay()}><FontAwesomeIcon icon={faPlay}/></button>
            <button type='button' onClick={e => this.onClickStop()} className={this.state.recording.mode === 'PLAYING' ? 'active' : ''}><FontAwesomeIcon icon={faStop}/></button>
            <button type='button' onClick={e => this.onClickClear()}><FontAwesomeIcon icon={faRotateLeft}/></button>
            <button type='button' onClick={e => this.onCreate()}><FontAwesomeIcon icon={faCircleArrowDown}/></button>
            <button type='button' onClick={e => this.onGenerate()}><FontAwesomeIcon icon={faCloudBolt}/></button>
        </div>
        {this.state.loading == true ? <progress className="progress is-small is-primary" max="100">15%</progress> : <></>}
        <div className="mt-5">
          <strong>Recorded notes</strong>
          <div style={{maxHeight: 200, overflow: 'hidden'}}>{JSON.stringify(this.state.recording.events)}</div>
        </div>
      </div>
    );
  }
}

export default App;
