import { Piano } from 'react-piano';
import { useState } from 'react';

const DURATION_UNIT = 0.2;
const DEFAULT_NOTE_DURATION = DURATION_UNIT;

export const PianoWithRecording = (props) => {
  const {
    record,
    setRecord,
    ...pianoProps
  } = props

  const [recordState, setRecordState] = useState({
    state: false,
    noteDuration: 0
  })

  const onPlayNoteInput = midiNumber => {
    setRecordState({
      ...recordState,
      state: false
    })
  };

  const onStopNoteInput = (midiNumber, { prevActiveNotes }) => {
    if (recordState.state === false) {
      recordNotes(prevActiveNotes, recordState.noteDuration);
      setRecordState({
        state: true,
        noteDuration: DEFAULT_NOTE_DURATION,
      });
    }
  }

  const recordNotes = (midiNumbers, duration) => {
    if (record.recording.mode !== 'RECORDING') {
      return;
    }
    const newEvents = midiNumbers.map(midiNumber => {
      return {
        midiNumber,
        time: record.recording.currentTime,
        duration: duration,
      };
    });
    
    setRecord({
      ...record,
      recording: {
        ...record.recording,
        events: record.recording.events.concat(newEvents),
        currentTime: record.recording.currentTime + duration,
      }
    });
  }

  const { mode, currentEvents } = record.recording

  const activeNotes = mode === 'PLAYING' ? currentEvents.map(event => event.midiNumber) : null;
  return  <Piano
  onPlayNoteInput={onPlayNoteInput}
  onStopNoteInput={onStopNoteInput}

  activeNotes={activeNotes}
  {...pianoProps}
  />
}