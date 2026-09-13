import { useState } from 'react'
import {
  Button,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  useToast,
  Checkbox,
  Box,
  Text,
 } from '@chakra-ui/react'
import { DeleteIcon } from '@chakra-ui/icons'
import { MicIcon, ClockOutlineIcon, PlusIcon } from './components/Icons'

import Onboarding from './components/Onboarding'
import CornellNote from './components/CornellNote'

import { Note_t, useNoteStore } from './state/noteStore'
import './App.css'

const App = () => {
  const { notes, addNote, checkUniqueName, removeNote, fetchNote} = useNoteStore((state) => ({
    notes: state.notes,
    addNote: state.addNote,
    checkUniqueName: state.checkUniqueName,
    removeNote: state.removeNote,
    fetchNote: state.fetchNote
  }))

  
  const [name, setName] = useState<string>('')
  const [active, setActive] = useState<string>('')
  const [selectedNote, setSelectedNote] = useState<Note_t>({
    name: '',
    ytId: '',
    micronote: true,
    content: [],
    transcription: [],
    expansion: [],
    generatedSummary: '',
    generatedSummary_P: '',
    theme_count: 0,
    time_count: 0,
    expand_count: 0,
    created_at: 0,
    updated_at: 0,
    recording_start: 0,
  })
  const [isChecked, setIsChecked] = useState(true)
  
  const { isOpen, onOpen, onClose } = useDisclosure()
  const toast = useToast()

  const saveNote = () => {
    if(name === '') {
      toast({
        title: 'Error',
        description: 'Please enter a name for the note',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
      return
    }

    const res = checkUniqueName(name)
    console.log('unique', res)

    if(!res){
      toast({
        title: 'Error',
        description: 'Note with same name already exists!',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
      return
    }

    //adding a new note for the first time in the state
    addNote({
      name,
      ytId: '',
      micronote: true, //isChecked,
      content: [],
      transcription: [],
      expansion: [],
      generatedSummary: '',
      generatedSummary_P: '',
      theme_count: 0,
      time_count: 0,
      expand_count: 0,
      created_at: Date.now(),
      updated_at: Date.now(),
      recording_start: 0,
    })

    setName('')
    setIsChecked(true)
    onClose()
  }

  const reset = () => {
    setName('')
    onClose()
  }

  const handleOption = (tab : string) => {
    setActive(tab)
    console.log('Selected ' + tab)
    if(tab !== 'onboarding'){
      const note: Note_t = fetchNote(tab)
      setSelectedNote({...note})
    }
  }

  const deleteNote = (note : Note_t) => {
    removeNote(note)
    if(active === note.name) setActive('')
    toast({
      title: 'Success',
      description: 'Note deleted successfully',
      status: 'success',
      duration: 5000,
      isClosable: true,
    })
  }

  const handleCheckBoxChange = (event: any) => {
    setIsChecked(event.target.checked)
    console.log(event.target.checked)
  }

  return (
    <div className='note-ui-root'>
      <Box sx={{ position: 'fixed', top: 0, left: 0, bottom: 0, display: 'flex', flexDirection: 'column', width: '248px', flexShrink: 0, background: 'var(--sidebar-bg)', padding: '20px 14px', gap: '18px', }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 6px', }}>
          <Box sx={{ width: '30px', height: '30px', borderRadius: '8px', background: 'var(--record)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, }}>
            <MicIcon size={16} color='#fff' />
          </Box>
          <Text sx={{ fontSize: '16px', fontWeight: 700, color: 'var(--sidebar-text)', letterSpacing: '-0.01em', }}>NoTeeline</Text>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, overflowY: 'auto', }}>
          <Text sx={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--sidebar-text-dim)', padding: '8px 10px 4px', }}>Notes</Text>

          <Box
            as='div'
            onClick={() => handleOption('onboarding')}
            sx={{
              display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 10px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer',
              background: active === 'onboarding' ? 'var(--sidebar-item-active)' : 'transparent',
              color: active === 'onboarding' ? 'var(--sidebar-text)' : 'var(--sidebar-text-dim)',
              fontWeight: active === 'onboarding' ? 500 : 400,
            }}
          >
            <ClockOutlineIcon size={15} />
            Onboarding Session
          </Box>

          {notes.map((note, index) => (
            <Box
              as='div'
              key={index}
              onClick={() => handleOption(note.name)}
              sx={{
                display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 10px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer',
                background: active === note.name ? 'var(--sidebar-item-active)' : 'transparent',
                color: active === note.name ? 'var(--sidebar-text)' : 'var(--sidebar-text-dim)',
                fontWeight: active === note.name ? 500 : 400,
              }}
            >
              <MicIcon size={15} color='currentColor' />
              <Box as='span' sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', }}>{note.name}</Box>
              <DeleteIcon
                boxSize={3}
                sx={{ cursor: 'pointer', flexShrink: 0, }}
                onClick={(event) => { event.stopPropagation(); deleteNote(note) }}
              />
            </Box>
          ))}
        </Box>

        <Button
          onClick={onOpen}
          sx={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '9px', borderRadius: '8px',
            border: '1px solid var(--border)', background: 'transparent', color: 'var(--sidebar-text)', fontSize: '13px', fontWeight: 500, height: 'auto',
          }}
        >
          <PlusIcon size={14} color='currentColor' />
          New Note
        </Button>

        <Modal
              isOpen={isOpen}
              onClose={onClose}
        >
          <ModalOverlay />
          <ModalContent>
              <ModalHeader>Create your note</ModalHeader>
              <ModalCloseButton />
              <ModalBody pb={6}>
                  <FormControl>
                      <FormLabel>Name</FormLabel>
                      <Input placeholder='Name of your note' onChange={(e) => setName(e.target.value)} />
                  </FormControl>
                  {/*<br />
                  <Checkbox defaultChecked onChange={handleCheckBoxChange}>
                    Enable micro note taking
                  </Checkbox>*/}
              </ModalBody>
              <ModalFooter>
                  <Button colorScheme='blue' mr={3} onClick={saveNote}>
                      Save
                  </Button>
                  <Button onClick={reset}>Cancel</Button>
              </ModalFooter>
          </ModalContent>
        </Modal>
      </Box>
      <div className='note-content'>
        {active === 'onboarding' && <Onboarding />}
        {active !== '' && active !== 'onboarding' && <CornellNote name={active} note={selectedNote} />}
      </div>
    </div>
  )
}

export default App
