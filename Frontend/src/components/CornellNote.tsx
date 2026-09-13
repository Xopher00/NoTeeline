/* eslint-disable */

import React, { useState, useEffect, useRef, } from 'react'
import { Button, useToast, keyframes, Drawer, DrawerOverlay, DrawerContent, DrawerHeader, DrawerBody, DrawerCloseButton, IconButton, Box, Text } from '@chakra-ui/react'
import {
    TimeIcon,
    EditIcon,
    ViewIcon,
} from '@chakra-ui/icons'
import { PlusIcon, ExpandArrowsIcon, ThreeLinesIcon, DocumentIcon, QuestionCircleIcon } from './Icons'
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd"

import { NotePoint, TranscriptLine, useNoteStore, Note_t } from '../state/noteStore'
import { openai, expandPoint, getFormattedPromptString, callGPT, generateQuiz, generateTheme, callGPTForSinglePoint, expandPointWithTranscript, generatepointsummary } from '../utils/helper'
import BulletPoint from './BulletPoint'
import Quiz, { Quiz_t } from './Quiz'

type NoteProps = {
    name: string;
    note: Note_t;
}

type bulletObject = {
    point: string;
    created_at: number;
    utc_time: number;
    editable: boolean;
    id: string;
    expand: number;
    compress: number;
    history: string[];
    edit: { e_point: string, e_time: number, }[][];
    state: number; // 0 for stable, 1 for expanding/reducing
    tempString: string; // string during streamlined output
    totalString: string;
}

let previousTime: number = 0
let forwardCount: number = 0
let reverseCount: number = 0

const CornellNote: React.FC<NoteProps> = ({ name, note }) => {
    const { updateNote, addYouTubeId, startRecording, addTranscription, computeButtonClick, fetchButtonStats, addSummary, addSummary_P } = useNoteStore((state) => ({
        updateNote: state.updateNote,
        addYouTubeId: state.addYouTubeId,
        startRecording: state.startRecording,
        addTranscription: state.addTranscription,
        computeButtonClick: state.computeButtonClick,
        fetchButtonStats: state.fetchButtonStats,
        addSummary: state.addSummary,
        addSummary_P: state.addSummary_P,
    }))
    const [micronote, setMicronote] = useState<boolean>(true)
    const [bulletPoints, setBulletPoints] = useState<bulletObject[]>([])
    const [newPoint, setNewPoint] = useState<string>('')
    const [newTitle, setNewTitle] = useState<string>('')
    const [isLink, setIsLink] = useState<boolean>(false)
    const [transcription, setTranscription] = useState<TranscriptLine[]>([]) //yt transcription
    const [playerTime, setPlayerTime] = useState<number>(0) //time of the yt player at any instant
    const [highlightedUtc, setHighlightedUtc] = useState<number>(0) //utc_time of the most recently added point, for a brief highlight
    const [transcriptDrawerOpen, setTranscriptDrawerOpen] = useState<boolean>(false)
    const [showQuizDrawer, setShowQuizDrawer] = useState<boolean>(false)
    const [showSummaryDrawer, setShowSummaryDrawer] = useState<boolean>(false)
    const [, setPause] = useState<boolean>(false)
    const [dragging, setDragging] = useState(false)
    const [draggingIndex, setDraggingIndex] = useState<number>(-1)
    const [initialY, setInitialY] = useState(0)
    const [expandButtonToggle, setExpandButtonToggle] = useState<boolean>(false)
    const [showQuiz, setShowQuiz] = useState<number>(0) // 0->no quiz, 1->called openai, 2->quiz visible
    const [showSummary, setShowSummary] = useState<boolean>(false)
    const [summary, setSummary] = useState<string>('')
    const [summary_p, setSummary_P] = useState<string>('')
    const [themeOrTime, setThemeOrTime] = useState<string>('theme')
    const [quizzes, setQuizzes] = useState<Quiz_t[]>([])
    const [quizInfo, setQuizInfo] = useState<any>(null)
    const [themes, setThemes] = useState<any>([])
    const [pauseCount, setPauseCount] = useState<number>(0)
    const toast = useToast()
    let timeoutHandle: any

    const js_sleep = (ms: number | undefined) => {
        return new Promise((resolve) => setTimeout(resolve, ms))
    }

    const pulseAnimation = keyframes`
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.5; transform: scale(0.85); }
    `

    const formatElapsed = (sec: number) => {
        const m = Math.floor(sec / 60).toString().padStart(2, '0')
        const s = Math.floor(sec % 60).toString().padStart(2, '0')
        return `${m}:${s}`
    }

    const OPEN_AI_KEY = JSON.parse(localStorage.getItem('gptKey'))
    const SLEEP_DELAY = 150

    const streamViewHelper = (index: number, text: string) => {
        const newPoints = [...bulletPoints]
        newPoints[index].tempString = text
        if (index === 0) console.log(`Sent => ${text}`)
        setBulletPoints(newPoints)
    }

    const genResponses = async (points: { point: string, history: string[], expand: number, created_at: number, utc_time: number, }[], transcription: TranscriptLine[]) => {
        const promptString = getFormattedPromptString()
        const responses = await Promise.all(
            points.map(async (point, idx) => {
                try {
                    if (point.history.length > point.expand) {
                        console.log(`${point.history.length}, ${point.expand}`)
                    } else {
                        const pointToBeExpanded = point.history[point.expand - 1]
                        const expandedPoint = expandPoint({ point: pointToBeExpanded, created_at: point.created_at, utc_time: point.utc_time, }, transcription)
                        const transcript = expandedPoint.transcript.join(".")
                        const PROMPT = "Expand the provided keypoint into a one sentence note.\n" +
                            "Transcript: ..." + transcript + "...\n" +
                            "Keypoint: " + expandedPoint.point + "\n" +
                            "Note:"

                        const res = await fetch('http://localhost:11434/v1/chat/completions', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                model: 'llama3.1:8b',
                                messages: [{ role: 'system', content: promptString }, { role: 'user', content: PROMPT }],
                                stream: true,
                                seed: 1,
                                temperature: 0.5,
                            }),
                        })

                        const reader = res.body.getReader()
                        const decoder = new TextDecoder('utf-8')
                        let response = ''

                        while (true) {
                            const chunk = await reader.read()
                            const { done, value } = chunk
                            if (done) {
                                break
                            }
                            const decodedChunk = decoder.decode(value)
                            const lines = decodedChunk.split('\n')
                            const parsedLines = lines.map(line => line.replace(/^data: /, '').trim()).filter(line => line !== '' && line !== '[DONE]').map(line => JSON.parse(line))

                            for (const parsedLine of parsedLines) {
                                const { choices } = parsedLine
                                const { delta } = choices[0]
                                const { content } = delta
                                if (content) {
                                    response += content
                                    streamViewHelper(idx, content)
                                    await js_sleep(SLEEP_DELAY)
                                }
                            }

                        }
                        return response
                    }
                } catch (e) {
                    console.log('Error ' + e)
                }
            })
        )

        let rep: (string | undefined)[] = []
        responses.forEach((response, index) => {
            rep.push(response)
        })

        return rep
    }

    // streaming openai exapnsion outputs for all points
    const testDrive = async () => {
        if (!expandButtonToggle) {
            toast({
                title: 'Expanding all the points...',
                description: 'Please wait while we expand the bullet points',
                status: 'info',
                duration: 5000,
                position: 'top-right',
                isClosable: true,
            })
        } else {
            toast({
                title: 'Reducing all the points...',
                description: 'Please wait while we reduce the bullet points',
                status: 'info',
                duration: 2000,
                position: 'top-right',
                isClosable: true,
            })
        }

        const newPoints = [...bulletPoints]

        if (!expandButtonToggle) newPoints.map((point: bulletObject) => point.expand = point.expand + 1)
        else newPoints.map((point: bulletObject) => point.expand = point.expand >= 1 ? point.expand - 1 : 0)
        newPoints.map((point: bulletObject) => point.state = 1)
        const points = bulletPoints.map((point: bulletObject) => ({
            point: point.point,
            history: point.history,
            expand: point.expand,
            created_at: point.created_at,
            utc_time: point.utc_time,
        }))

        setBulletPoints(newPoints)
        console.log('expand button: ' + expandButtonToggle)

        if (!expandButtonToggle) {
            genResponses(points, transcription).then(res => {
                console.log('Done expanding ...')
                const ret = newPoints.map((newPoint, idx) => {
                    let edit: { e_point: string, e_time: number, }[][] = [...newPoint.edit]
                    edit.push([])
                    edit[newPoint.expand].push({ e_point: res[idx], e_time: Date.now() })
                    return {
                        ...newPoint,
                        history: [...newPoint.history, res[idx]],
                        edit: edit,
                        state: 0,
                        tempString: '',
                        totalString: '',
                    }
                })

                setExpandButtonToggle(!expandButtonToggle)
                setBulletPoints(ret)
                computeButtonClick(newTitle, 'expand')

            })
        }
    }

    useEffect(() => {
        console.log(window.innerWidth, window.innerHeight)
        const iw = window.innerWidth

        setNewTitle(name)
        setMicronote(note.micronote)
        setExpandButtonToggle(false)
        setShowSummary(false)
        setSummary('')
        setSummary_P('')
        setThemes([])
        setThemeOrTime('theme')
        setPauseCount(0)
        setQuizzes([])

        setIsLink(false)

        if (note?.transcription) {
            setTranscription(note.transcription)
        }

        if (note?.generatedSummary !== '') {
            setSummary(note.generatedSummary)
        }

        if (note?.generatedSummary_P !== '') {
            setSummary_P(note.generatedSummary_P)
            setShowSummary(true)
        }

        startRecording(name, Date.now())

        const points = note.content?.map((cont: NotePoint, idx: number) => ({
            ...cont,
            editable: false,
            id: `bullet-${idx}`,
            expand: 0,
            compress: 0,
            history: [cont.point],
            edit: [[{ e_point: cont.point, e_time: cont.utc_time, }]],
            state: 0,
            tempString: '',
            totalString: '',
        }))

        let pointStreams: string[] = []
        points.map(() => pointStreams.push(''))
        localStorage.setItem('pointStreams', JSON.stringify(pointStreams))

        setBulletPoints(points)

        const handler = (e: Event) => e.preventDefault()
        document.addEventListener('gesturestart', handler)
        document.addEventListener('gesturechange', handler)
        document.addEventListener('gestureend', handler)

        return () => {
            document.removeEventListener('gesturestart', handler)
            document.removeEventListener('gesturechange', handler)
            document.removeEventListener('gestureend', handler)
        }
    }, [name])

    //when a new point is typed and 'enter' is pressed
    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            event.preventDefault()

            const time_now = Date.now()

            const updatedPoints = bulletPoints.map((point: bulletObject) => {
                return {
                    point: point.point,
                    created_at: point.created_at,
                    utc_time: point.utc_time,
                }
            })

            const np = {
                point: newPoint,
                created_at: playerTime, //time of the yt player at the moment of pressing enter
                utc_time: time_now,
            }

            const maxId = Math.max(...bulletPoints.map((point: bulletObject) => parseInt(point.id.split('-')[1])))

            updatedPoints.push(np)

            updateNote(newTitle, updatedPoints)
            setBulletPoints([
                ...bulletPoints,
                {
                    ...np,
                    editable: false,
                    id: `bullet-${maxId}`,
                    expand: 0,
                    compress: 0,
                    history: [newPoint],
                    edit: [[{ e_point: newPoint, e_time: time_now, }]],
                },
            ])
            let pointStreams = JSON.parse(localStorage.getItem('pointStreams') ?? '""') //adding a stream tracker for a new point
            pointStreams.push('')
            localStorage.setItem('pointStreams', JSON.stringify(pointStreams))
            setNewPoint('')

            setHighlightedUtc(time_now)
            setTimeout(() => {
                setHighlightedUtc((prev) => (prev === time_now ? 0 : prev))
            }, 1000)
        }
    }

    //marks a bullet point as 'editable: true'
    const editPoint = (id: number) => {
        const newPoints = [...bulletPoints]
        newPoints[id].editable = true
        setBulletPoints(newPoints)
    }

    //instantly changes an editable bullet point's state when typed on input
    const changeEditPoint = (index: number, val: string) => {
        const newPoints = bulletPoints.map((bulletPoint, idx) => {
            if (idx === index) {
                let history = [...bulletPoint.history]
                history[bulletPoint.expand] = val //changing the point itself

                return {
                    ...bulletPoint,
                    history: history,
                }
            } else {
                return bulletPoint
            }
        })

        setBulletPoints(newPoints)
    }

    //makes an editable bullet point to uneditable
    const updateEditPoint = (index: number, event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === 'Enter') {
            event.preventDefault()
            const newPoints = [...bulletPoints]
            newPoints[index].editable = false
            const latestEdit = newPoints[index].history[newPoints[index].expand]
            newPoints[index].edit[newPoints[index].expand].push({ e_point: latestEdit, e_time: Date.now() })
            setBulletPoints(newPoints)
            updateNote(newTitle, bulletPoints.map((point: bulletObject) => ({ point: point.point, created_at: point.created_at, utc_time: point.utc_time })))
        }
    }

    let recordingStartMs = 0
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)

    const startLectureRecording = () => {
        navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
            setIsLink(true)
            recordingStartMs = Date.now()
            const mediaRecorder = new MediaRecorder(stream)
            mediaRecorderRef.current = mediaRecorder

            mediaRecorder.ondataavailable = (event: BlobEvent) => {
                if (event.data.size === 0) return
                const formData = new FormData()
                formData.append('audio', event.data, 'chunk.webm')

                fetch('http://localhost:4000/transcribe-chunk', {
                    method: 'POST',
                    body: formData,
                }).then(res => res.json()).then(segments => {
                    const elapsedOffset = (Date.now() - recordingStartMs) / 1000 - 10
                    const response = segments.map((seg: { text: string, start: number, duration: number }) => ({
                        text: seg.text,
                        offset: elapsedOffset + seg.start,
                        duration: seg.duration,
                    }))
                    setTranscription(prev => {
                        const updated = [...prev, ...response]
                        addTranscription(name, updated)
                        return updated
                    })
                }).catch(err => {
                    console.log(err)
                    toast({
                        title: 'Error',
                        description: 'Error transcribing lecture audio chunk!',
                        status: 'error',
                        duration: 5000,
                        isClosable: true,
                    })
                })
            }

            mediaRecorder.start(10000)
            loop({ target: null })
        }).catch(err => {
            console.log(err)
            toast({
                title: 'Error',
                description: 'Could not access the microphone!',
                status: 'error',
                duration: 5000,
                isClosable: true,
            })
        })
    }

    const handleVideoStateChange = (e: any) => {
        const time = (Date.now() - recordingStartMs) / 1000
        setPlayerTime(time)
        timeoutHandle = window.setTimeout(() => handleVideoStateChange(e), 1000)
    }

    const loop = (e: any) => {
        timeoutHandle = window.setTimeout(() => handleVideoStateChange(e), 1000)
    }

    const stopVideo = () => {
        window.clearTimeout(timeoutHandle)
        const recorder = mediaRecorderRef.current
        if (recorder) {
            recorder.stop()
            recorder.stream.getTracks().forEach(track => track.stop())
            mediaRecorderRef.current = null
        }
        setIsLink(false)
    }

    const countPause = () => {
        setPauseCount((prevCount) => prevCount + 1)
        setPause(true)
        // console.log(`pause: ${pauseCount+1}`)
    }

    //expand all points at a time
    const expandNote = async () => {
        if (!expandButtonToggle) {
            toast({
                title: 'Expanding all the points...',
                description: 'Please wait while we expand the bullet points',
                status: 'info',
                duration: 5000,
                position: 'top-right',
                isClosable: true,
            })
        } else {
            toast({
                title: 'Reducing all the points...',
                description: 'Please wait while we reduce the bullet points',
                status: 'info',
                duration: 2000,
                position: 'top-right',
                isClosable: true,
            })
        }

        // setExpanding(0)

        const newPoints = [...bulletPoints]

        if (!expandButtonToggle) newPoints.map((point: bulletObject) => point.expand = point.expand + 1)
        else newPoints.map((point: bulletObject) => point.expand = point.expand >= 1 ? point.expand - 1 : 0)

        const points = bulletPoints.map((point: bulletObject) => ({
            point: point.point,
            history: point.history,
            expand: point.expand,
            created_at: point.created_at,
            utc_time: point.utc_time,
        }))

        setBulletPoints(newPoints)
        console.log('expand button: ' + expandButtonToggle)

        if (!expandButtonToggle) {
            callGPT(points, transcription).then(res => {
                if (res) {

                    const ret = newPoints.map((newPoint, idx) => {
                        if (res[idx].old) {
                            return newPoint
                        } else {
                            let edit: { e_point: string, e_time: number, }[][] = [...newPoint.edit]
                            edit.push([])
                            edit[newPoint.expand].push({ e_point: res[idx].expansion, e_time: Date.now() })
                            return {
                                ...newPoint,
                                history: [...newPoint.history, res[idx].expansion],
                                edit: edit,
                            }
                        }
                    })

                    setExpandButtonToggle(!expandButtonToggle)
                    setBulletPoints(ret)
                    computeButtonClick(newTitle, 'expand')

                    // ripple effect of expansion onto the themes if they exist
                    if (themes.length > 0) {
                        const newThemes = themes.map((theme: { type: string, val: string, editable: boolean }, index: number) => {
                            if (theme['type'] === 'point') {
                                const val = theme['val']
                                const idxVal = newPoints.findIndex((point: bulletObject) => point.point === val)
                                return {
                                    ...theme,
                                    val: ret[idxVal].history[ret[idxVal].expand]
                                }
                            } else {
                                return theme
                            }
                        })

                        console.log('Expanded themes:')
                        console.log(newThemes)
                        setThemes(newThemes)
                    }
                    // console.log(res)
                    // setExpandButtonToggle(!expandButtonToggle)
                } else {
                    toast({
                        title: 'Error...',
                        description: 'Error in expanding the bullet point',
                        status: 'error',
                        duration: 5000,
                        position: 'top-right',
                        isClosable: true,
                    })
                }
            }).catch(() => {
                console.log('Error calling GPT4: ')
            })
        } else {
            toast({
                title: 'Done reducing...',
                status: 'info',
                duration: 2000,
                position: 'top-right',
                isClosable: true,
            })

            // ripple effect of expansion onto the themes if they exist
            if (themes.length > 0) {
                const newThemes = themes.map((theme: { type: string, val: string, editable: boolean }, index: number) => {
                    if (theme['type'] === 'point') {
                        const val = theme['val']
                        const idxVal = newPoints.findIndex((point: bulletObject) => point.history[point.expand + 1] === val)
                        return {
                            ...theme,
                            val: newPoints[idxVal].history[newPoints[idxVal].expand]
                        }
                    } else {
                        return theme
                    }
                })

                console.log('Reduced themes:')
                console.log(newThemes)
                setThemes(newThemes)
            }
            setExpandButtonToggle(!expandButtonToggle)
            computeButtonClick(newTitle, 'expand')
        }
    }


    const reorderThemes = (list: { type: string, val: string }[], startIndex: number, endIndex: number) => {
        const result = Array.from(list)
        const [removed] = result.splice(startIndex, 1)
        result.splice(endIndex, 0, removed)

        return result
    }

    const reorder = (list: bulletObject[], startIndex: number, endIndex: number) => {
        const result = Array.from(list)
        const [removed] = result.splice(startIndex, 1)
        result.splice(endIndex, 0, removed)

        return result
    }

    const onDrageEndThemes = (result: any) => {
        console.log('Result ', result)

        // dropped outside the list
        if (!result.destination) {
            return
        }

        const items = reorderThemes(
            themes,
            result.source.index,
            result.destination.index
        )

        setThemes(items)
    }

    const onDragEnd = (result: any) => {
        console.log('Result ', result)

        // dropped outside the list
        if (!result.destination) {
            return
        }

        const items = reorder(
            bulletPoints,
            result.source.index,
            result.destination.index
        )

        setBulletPoints(items)
    }

    // styles of the draggable note points
    const getBulletPointStyle = (isDragging: any, draggableStyle: any) => ({
        // some basic styles to make the items look a bit nicer
        userSelect: "none",
        padding: '1vw',
        margin: `0 0 1vh 0`,
        borderRadius: '10px',
        // change background colour if dragging
        background: isDragging ? "lightgreen" : "#FFF",

        // styles we need to apply on draggables
        ...draggableStyle
    })

    const handleContextMenu = (e: any) => {
        if (micronote) {
            e.preventDefault()
            e.stopPropagation()
        }
    }

    const handleMouseDown = (e: any, index: number) => {
        if (micronote && e.button === 2) {
            // Detect right mouse button (2)
            setDragging(true)
            setDraggingIndex(index)
            setInitialY(e.clientY)
        }
    }

    //calling openai api when expanding a single point from another function
    const expandSinglePoint = async (point: string, created_at: number, utc_time: number) => {
        const obj = {
            point: point,
            created_at: created_at,
            utc_time: utc_time,
        }

        const res = await callGPTForSinglePoint(obj, transcription)
        return res
    }

    //call openai api for a single point expansion
    const openAIHelper = (newPoints: bulletObject[]) => {
        const pointToBeUpdated = newPoints[draggingIndex]

        expandSinglePoint(pointToBeUpdated.history[pointToBeUpdated.expand], pointToBeUpdated.created_at, pointToBeUpdated.utc_time).then(res => {
            if (res) {
                const editTime = Date.now()
                newPoints = bulletPoints.map((bp, idx) => {
                    if (idx === draggingIndex) {
                        let edit = [...bp.edit]
                        edit.push([])
                        edit[bp.expand].push({ e_point: res, e_time: editTime })
                        return {
                            ...bp,
                            history: [...bp.history, res],
                            edit: edit,
                        }
                    } else {
                        return bp
                    }

                })
                setDraggingIndex(-1)
                setInitialY(0)
                setBulletPoints(() => newPoints)
            } else {
                toast({
                    title: 'Error...',
                    description: 'Error in expanding the bullet point',
                    status: 'error',
                    duration: 5000,
                    position: 'top-right',
                    isClosable: true,
                })
            }
        }).catch(() => alert('Error calling GPT-4...'))
    }

    const callGPTForSinglePointFromComponent = async (point: NotePoint, transcription: TranscriptLine[], index: number) => {
        const expandedPoint = expandPoint(point, transcription)
        const transcript = expandedPoint.transcript.join(".")

        const promptString = getFormattedPromptString()

        const PROMPT = promptString +
            "Transcript: ..." + transcript + "...\n" +
            "Summary: " + expandedPoint.point + "\n" +
            "Note:"

        const res = await openai.chat.completions.create({
            messages: [{ role: "system", content: PROMPT }],
            model: "llama3.1:8b",
            stream: true,
            // seed: SEED,
            temperature: 0.2,
        })

        for await (const chunk of res) {
            console.log(`Point ${index}: ${chunk.choices[0]?.delta?.content}` || "")
            addToPointStream(index, chunk.choices[0]?.delta?.content || "")
        }

        return index
    }

    const addToPointStream = (index: number, chunk: any) => {
        const pointStreams = JSON.parse(localStorage.getItem('pointStreams') ?? '""')
        const pointStream = pointStreams[index]
        if (pointStream === '') {
            setDraggingIndex(-1)
            setInitialY(0)
        }

        pointStreams[index] += chunk
        localStorage.setItem('pointStreams', JSON.stringify(pointStreams))
        console.log(pointStreams)

        setBulletPoints(prevPoints => {
            let newPoints = [...prevPoints]
            let hst = [...newPoints[index].history]
            if (pointStream === '') {
                hst = [...hst, pointStreams[index]]
            } else {
                hst[index] = pointStreams[index]
            }
            newPoints[index].history = hst

            return newPoints
        })
    }

    const newOpenAIHelper = async (newPoints: bulletObject[]) => {
        const pointToBeUpdated = newPoints[draggingIndex]

        const obj = {
            point: pointToBeUpdated.history[pointToBeUpdated.expand],
            created_at: pointToBeUpdated.created_at,
            utc_time: pointToBeUpdated.utc_time,
        }

        await callGPTForSinglePointFromComponent(obj, transcription, draggingIndex)
    }

    const handleMouseUp = (e: any) => {
        if (micronote && dragging) {
            setDragging(false)
            const finalY = e.clientY

            //too short displacement
            if (Math.abs(finalY - initialY) < 30) return

            const isUpwards: boolean = finalY < initialY

            const newPoints = [...bulletPoints]
            if (isUpwards) newPoints[draggingIndex].expand = newPoints[draggingIndex].expand + 1
            else newPoints[draggingIndex].expand = Math.max(0, newPoints[draggingIndex].expand - 1)

            if (!isUpwards) {
                toast({
                    title: 'Compressing...',
                    description: 'Please wait while we compress the bullet point',
                    status: 'info',
                    duration: 2000,
                    position: 'top-right',
                    isClosable: true,
                })

                setDraggingIndex(-1)
                setInitialY(0)
                setBulletPoints(newPoints)
            } else {
                toast({
                    title: 'Expanding...',
                    description: 'Please wait while we expand the bullet point',
                    status: 'info',
                    duration: 2000,
                    position: 'top-right',
                    isClosable: true,
                })

                if (newPoints[draggingIndex].history.length > newPoints[draggingIndex].expand) {
                    setDraggingIndex(-1)
                    setInitialY(0)
                    setBulletPoints(newPoints)
                } else {
                    openAIHelper(newPoints)
                }
            }
        }
    }

    const extractThemes = (text: string) => {
        const themes: { [key: string]: string[] } = {}
        const topicRegex = /<Topic name="([^"]+)">([\s\S]*?)<\/Topic>/g

        let match: RegExpExecArray | null;
        while ((match = topicRegex.exec(text)) !== null) {
            const [, themeName, content] = match
            const points = content.match(/<p>(.*?)<\/p>/g)?.map(p => p.replace(/<\/?p>/g, '')) || []
            themes[themeName] = points
        }

        console.log('themes', themes)
        return themes;
    }

    const constructThemesToShow = (obj: { [key: string]: string[] }) => {
        let themes: { type: string, val: string, editable: boolean }[] = []
        for (const [topic, points] of Object.entries(obj)) {
            themes.push({ type: 'topic', val: topic, editable: false, })
            themes.push(...points.map((point: string) => ({ type: 'point', val: point, editable: false, })))
        }
        return themes
    }

    //theme sorting
    const handleTheme = () => {
        toast({
            title: 'Generating themes. Please wait...',
            status: 'info',
            duration: 2000,
            position: 'top-right',
            isClosable: true
        })

        const newPoints: string[] = bulletPoints.map((bulletPoint, index) => {
            return `${index + 1}. ${bulletPoint.history[bulletPoint.expand]}`
        })

        generateTheme(newPoints).then(res => {
            // console.log(res)
            const t = extractThemes(res)
            computeButtonClick(newTitle, 'theme')
            console.log('Themes generated: ')
            console.log(t)
            const t2 = constructThemesToShow(t)
            console.log('Themes to show: ')
            console.log(t2)
            setThemes(t2)
            setThemeOrTime('time')
        }).catch(e => {
            console.log(`Quiz error: ${e}`)
            toast({
                title: 'Error generating theme. Please try again...',
                status: 'info',
                duration: 2000,
                position: 'top-right',
                isClosable: true
            })
        })
    }

    const editTheme = (index: number) => {
        const newThemes = themes.map((theme: { type: string, val: string, editable: boolean }, idx: number) => {
            if (idx === index) {
                return {
                    ...theme,
                    editable: true,
                }
            } else {
                return theme
            }
        })

        setThemes(newThemes)
    }

    const changeTheme = (index: number, val: string) => {
        const newThemes = themes.map((theme: { type: string, val: string, editable: boolean }, idx: number) => {
            if (idx === index) {
                return {
                    ...theme,
                    val: val,
                }
            } else {
                return theme
            }
        })

        setThemes(newThemes)
    }

    const stopThemeEdit = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
        if (e.key === 'Enter') {
            const newThemes = themes.map((theme: { type: string, val: string, editable: boolean }, idx: number) => {
                if (idx === index) {
                    return {
                        ...theme,
                        editable: false,
                    }
                } else {
                    return theme
                }
            })

            setThemes(newThemes)
        }
    }
    //time sorting
    const handleSort = () => {
        setThemeOrTime('theme')
        const sortedBulletPoints = [...bulletPoints].sort((a, b) => a.created_at - b.created_at)
        console.log('Sorted bullet points: ')
        console.log(sortedBulletPoints)
        setBulletPoints(sortedBulletPoints)
        computeButtonClick(newTitle, 'time')
    }

    const extractQuizzesInformation = (quizzesText: any) => {
        const quizRegex = /<Question>(.*?)<\/Question>\s*<Choice>(.*?)<\/Choice>\s*<Choice>(.*?)<\/Choice>\s*<Choice>(.*?)<\/Choice>\s*<Choice>(.*?)<\/Choice>\s*<Answer>(.*?)<\/Answer>/gs

        const matches = Array.from(quizzesText.matchAll(quizRegex))

        const quizzes = matches.map((match: any) => {
            const [, question, option1, option2, option3, option4, answer] = match as any
            const options = [option1, option2, option3, option4]
            return { question, answer, options }
        })

        return quizzes
    }

    const handleQuiz = () => {
        toast({
            title: 'Starting quiz. Please wait...',
            status: 'info',
            duration: 2000,
            position: 'top-right',
            isClosable: true
        })

        setShowQuiz(1)

        const newPoints: string[] = bulletPoints.map((bulletPoint, index) => {
            return `${bulletPoint.history[bulletPoint.expand]}`
        })

        console.log(newPoints);

        generateQuiz(newPoints, summary).then(res => {
            // console.log(res)
            const qs = extractQuizzesInformation(res)
            // console.log(qs)
            setQuizzes(qs)
            setShowQuiz(2)
        }).catch(e => {
            console.log(`Quiz error: ${e}`)
            toast({
                title: 'Error generating quiz. Please try again...',
                status: 'info',
                duration: 2000,
                position: 'top-right',
                isClosable: true
            })
        })
    }

    //summarizing using the whole transcription
    const handleSummary = () => {
        if (summary !== '') {
            return
        }

        toast({
            title: 'Summarizing notes...',
            status: 'info',
            duration: 2000,
            position: 'top-right',
            isClosable: true
        })
        setShowSummary(!showSummary)

        let tr = ''
        for (let i = 0; i < transcription.length; i++) {
            tr += transcription[i].text
        }

        generatepointsummary(tr, '').then(res => {
            console.log('Summary:')
            console.log(res)
            setSummary(res)
            addSummary(newTitle, res)
        }).catch(e => console.log(e))
    }

    //passing expanded note-points and transcript
    const noteTranscriptSummary = () => {
        toast({
            title: 'Summarizing notes from points...',
            status: 'info',
            duration: 2000,
            position: 'top-right',
            isClosable: true
        })
        let expanded_points = []
        for (let i = 0; i < bulletPoints.length; i++) {
            const point = { point: bulletPoints[i].history[bulletPoints[i].expand], created_at: bulletPoints[i].created_at, utc_time: bulletPoints[i].utc_time, }
            expanded_points.push(expandPointWithTranscript(point, transcription))
        }

        let points_str = '';
        for (let i = 0; i < expanded_points.length; i++) {
            points_str += `${expanded_points[i].point}`
        }

        generatepointsummary(points_str, summary).then(res => {
            console.log('summary from points ' + res)
            setSummary_P(res)
            addSummary_P(newTitle, res)
            setShowSummary(true)
        }).catch(e => {
            console.log(`Summary Point error: ${e}`)
            toast({
                title: 'Error generating summary. Please try again...',
                status: 'info',
                duration: 2000,
                position: 'top-right',
                isClosable: true
            })
        })
    }

    //download button-click stats
    const handleDownload = () => {
        const newPoints = bulletPoints.map((bulletPoint, idx) => {
            const p = { point: bulletPoint.history[bulletPoint.expand], created_at: bulletPoint.created_at, utc_time: bulletPoint.utc_time, }
            const expanded_p = expandPointWithTranscript(p, transcription)
            let note_taking_time = -1
            if (idx === 0) {
                note_taking_time = bulletPoint.created_at * 1000.0
            } else {
                note_taking_time = bulletPoint.utc_time - bulletPoints[idx - 1].utc_time
            }

            return {
                point: bulletPoint.point,
                fraction_transcript: expanded_p.transcript,
                // created_at: bulletPoint.created_at,
                utc_time: bulletPoint.utc_time,
                note_taking_time: note_taking_time,
                edit: bulletPoint.edit
            }
        })

        const obj = fetchButtonStats(newTitle)
        const url = isLink ? 'local-lecture-recording' : ''
        let userLog: any = {
            buttonStats: obj,
            pauseCount: pauseCount,
            forwardCount: forwardCount,
            reverseCount: reverseCount,
            summary_t: summary,
            summary_p: summary_p,
            url: url,
            raw_transcript: [...transcription].sort((a, b) => a.offset - b.offset),
        }
        userLog.editHistory = newPoints

        const jsonString = JSON.stringify(userLog, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });

        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);

        link.download = name.replace(/\s+/g, '') + 'bulletPointsData.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    //store state of quiz while changing panels
    const changeQuizInfo = (info: any) => {
        setQuizInfo(info)
    }

    return (
        <>
        <Drawer isOpen={transcriptDrawerOpen} placement='right' onClose={() => setTranscriptDrawerOpen(false)} size='sm'>
            <DrawerOverlay />
            <DrawerContent>
                <DrawerCloseButton />
                <DrawerHeader borderBottomWidth='1px'>Transcript</DrawerHeader>
                <DrawerBody sx={{ padding: '16px', }}>
                    {transcription.length === 0 ?
                        <Text sx={{ fontSize: '14px', color: 'var(--text-dim)', }}>
                            No transcript recorded yet — it fills in here as you record a lecture.
                        </Text>
                        :
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '14px', }}>
                            {[...transcription].sort((a, b) => a.offset - b.offset).map((line, idx) => (
                                <Box key={idx}>
                                    <Text sx={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: "'JetBrains Mono', ui-monospace, monospace", marginBottom: '2px', }}>
                                        {formatElapsed(line.offset)}
                                    </Text>
                                    <Text sx={{ fontSize: '14px', lineHeight: '1.5', color: 'var(--text)', }}>
                                        {line.text}
                                    </Text>
                                </Box>
                            ))}
                        </Box>
                    }
                </DrawerBody>
            </DrawerContent>
        </Drawer>

        <Drawer isOpen={showQuizDrawer} placement='right' onClose={() => setShowQuizDrawer(false)} size='sm'>
            <DrawerOverlay />
            <DrawerContent>
                <DrawerCloseButton />
                <DrawerHeader borderBottomWidth='1px'>Cue Questions</DrawerHeader>
                <DrawerBody sx={{ padding: '16px', }}>
                    {showQuiz === 0 &&
                        <Button colorScheme='teal' onClick={handleQuiz}>Generate Quiz</Button>
                    }
                    {showQuiz === 1 && <p>Loading quizzes...</p>}
                    {showQuiz === 2 && (
                        quizzes && quizzes.length > 0 ?
                            <Quiz quizzes={quizzes} quizInfo={quizInfo} changeQuizInfo={changeQuizInfo} />
                            :
                            <p>No quizzes to show !</p>
                    )}
                </DrawerBody>
            </DrawerContent>
        </Drawer>

        <Drawer isOpen={showSummaryDrawer} placement='right' onClose={() => setShowSummaryDrawer(false)} size='sm'>
            <DrawerOverlay />
            <DrawerContent>
                <DrawerCloseButton />
                <DrawerHeader borderBottomWidth='1px'>Summary</DrawerHeader>
                <DrawerBody sx={{ padding: '16px', }}>
                    {!showSummary && <Button colorScheme='cyan' onClick={noteTranscriptSummary}>Generate Summary</Button>}
                    {showSummary &&
                        (micronote ?
                            <Text sx={{ fontSize: '14px', lineHeight: '1.6', }}>{summary_p}</Text>
                            :
                            <Text sx={{ fontSize: '14px', lineHeight: '1.6', }}>{summary}</Text>)
                    }
                </DrawerBody>
            </DrawerContent>
        </Drawer>

        <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100vh', background: 'var(--bg)', }}>
            {/* Topbar */}
            <Box sx={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 28px', borderBottom: '1px solid var(--border)', flexShrink: 0, gap: '20px',
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0, }}>
                    <Text sx={{ fontSize: '17px', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', }}>
                        {newTitle}
                    </Text>
                    {isLink &&
                        <Text sx={{ fontSize: '12px', color: 'var(--text-dim)', background: 'var(--surface-alt)', padding: '3px 8px', borderRadius: '6px', fontFamily: "'JetBrains Mono', ui-monospace, monospace", flexShrink: 0, }}>
                            {formatElapsed(playerTime)}
                        </Text>
                    }
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: '8px', }}>
                        {micronote &&
                            <Button
                                onClick={testDrive}
                                sx={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 11px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '12.5px', fontWeight: 500, height: 'auto', }}
                            >
                                <ExpandArrowsIcon size={14} />
                                {expandButtonToggle ? 'Reduce' : 'Expand'}
                            </Button>
                        }
                        {micronote && (
                            themeOrTime === 'theme' ?
                                <Button
                                    onClick={handleTheme}
                                    sx={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 11px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '12.5px', fontWeight: 500, height: 'auto', }}
                                >
                                    <ThreeLinesIcon size={14} />
                                    Theme
                                </Button>
                                :
                                <Button
                                    onClick={handleSort}
                                    sx={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 11px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '12.5px', fontWeight: 500, height: 'auto', }}
                                >
                                    <TimeIcon boxSize={3.5} />
                                    Time
                                </Button>
                        )}
                        <Button
                            onClick={() => setShowSummaryDrawer(true)}
                            sx={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 11px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '12.5px', fontWeight: 500, height: 'auto', }}
                        >
                            <DocumentIcon size={14} />
                            Summary
                        </Button>
                        <Button
                            onClick={() => setShowQuizDrawer(true)}
                            sx={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 11px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '12.5px', fontWeight: 500, height: 'auto', }}
                        >
                            <QuestionCircleIcon size={14} />
                            Quiz
                        </Button>
                        <IconButton
                            aria-label='View transcript'
                            icon={<ViewIcon />}
                            variant='outline'
                            onClick={() => setTranscriptDrawerOpen(true)}
                        />
                    </Box>

                    {
                        !isLink ?
                            <Button colorScheme='red' borderRadius='9px' onClick={startLectureRecording}>
                                Start Recording
                            </Button>
                            :
                            <Button colorScheme='gray' borderRadius='9px' onClick={stopVideo}>
                                Stop Recording
                            </Button>
                    }
                </Box>
            </Box>

            {/* Content row */}
            <Box sx={{ display: 'flex', flex: 1, minHeight: 0, }}>

                {/* Notes column */}
                <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1.4, minWidth: 0, overflowY: 'auto', padding: '22px 28px', }}>
                    {themeOrTime !== 'time' ?
                        <DragDropContext onDragEnd={onDragEnd}>
                            <Droppable droppableId="droppable">
                                {(provided: any) => (
                                    <div
                                        {...provided.droppableProps}
                                        ref={provided.innerRef}
                                    >
                                        {bulletPoints.map((bulletPoint, index) => (
                                            <Draggable key={bulletPoint.id} draggableId={bulletPoint.id} index={index}>
                                                {(provided: any, snapshot: any) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        {...provided.dragHandleProps}
                                                        style={{
                                                            ...getBulletPointStyle(
                                                                snapshot.isDragging,
                                                                provided.draggableProps.style
                                                            ),
                                                            display: 'flex',
                                                            padding: '10px 12px',
                                                            borderRadius: '8px',
                                                            margin: '0 -12px',
                                                            background: bulletPoint.utc_time === highlightedUtc ? 'var(--highlight-bg)' : 'transparent',
                                                            boxShadow: bulletPoint.utc_time === highlightedUtc ? 'inset 0 0 0 1px var(--highlight-border)' : 'none',
                                                            transition: 'background 900ms ease, box-shadow 900ms ease',
                                                        }}
                                                        onContextMenu={handleContextMenu}
                                                        onMouseDown={(e) => handleMouseDown(e, index)}
                                                        onMouseUp={handleMouseUp}
                                                    >
                                                        {
                                                            !bulletPoint.editable ?
                                                                <BulletPoint
                                                                    key={index}
                                                                    index={index}
                                                                    expand={bulletPoint.expand}
                                                                    history={bulletPoint.history}
                                                                    created_at={bulletPoint.created_at}
                                                                    editPoint={editPoint}
                                                                    state={bulletPoint.state}
                                                                    tempString={bulletPoint.tempString}
                                                                />
                                                                :
                                                                <textarea
                                                                    defaultValue={bulletPoint.point}
                                                                    className='note-input'
                                                                    onChange={(e) => changeEditPoint(index, e.target.value)}
                                                                    onKeyDown={event => updateEditPoint(index, event)}
                                                                    rows={Math.max(Math.ceil(bulletPoint.point.length / 200), 1)}
                                                                />
                                                        }
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </DragDropContext>
                        :
                        <DragDropContext onDragEnd={onDrageEndThemes}>
                            <Droppable droppableId="droppable">
                                {(provided: any) => (
                                    <div
                                        {...provided.droppableProps}
                                        ref={provided.innerRef}
                                    >
                                        {themes.map((theme: any, index: any) => (
                                            <Draggable key={theme['val']} draggableId={theme['val']} index={index}>
                                                {(provided: any, snapshot: any) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        {...provided.dragHandleProps}
                                                        style={getBulletPointStyle(
                                                            snapshot.isDragging,
                                                            provided.draggableProps.style
                                                        )}
                                                        onContextMenu={handleContextMenu}
                                                        onMouseDown={(e) => handleMouseDown(e, index)}
                                                        onMouseUp={handleMouseUp}
                                                    >
                                                        {theme['type'] === 'topic' ?
                                                            !theme['editable'] ?
                                                                <h4 style={{ color: 'var(--text)', fontWeight: 'bold', }}>
                                                                    {theme['val']} <EditIcon w={4} color='green.500' style={{ cursor: 'pointer', }} onClick={() => editTheme(index)} />
                                                                </h4>
                                                                :
                                                                <input
                                                                    type='text'
                                                                    defaultValue={theme['val']}
                                                                    onChange={(e) => changeTheme(index, e.target.value)}
                                                                    onKeyDown={(e) => stopThemeEdit(e, index)}
                                                                />
                                                            :
                                                            <p>{theme['val']}</p>
                                                        }
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </DragDropContext>
                    }
                    {bulletPoints.length === 0 && themeOrTime !== 'time' &&
                        <Text sx={{ fontSize: '14px', color: 'var(--text-dim)', paddingTop: '12px', }}>
                            No notes yet — type a keypoint below while the lecture plays.
                        </Text>
                    }
                </Box>

                {/* Live transcript */}
                <Box sx={{ display: 'flex', flexDirection: 'column', width: '340px', flexShrink: 0, borderLeft: '1px solid var(--border)', background: 'var(--surface-alt)', overflow: 'hidden', }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '16px 20px 12px', }}>
                        <Box as='span' sx={{
                            width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0,
                            background: isLink ? 'var(--record)' : 'var(--text-dim)',
                            animation: isLink ? `${pulseAnimation} 1.4s ease-in-out infinite` : 'none',
                        }} />
                        <Text sx={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-dim)', }}>
                            {isLink ? 'Listening…' : 'Live Transcript'}
                        </Text>
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '0 20px 20px', overflowY: 'auto', }}>
                        {transcription.length === 0 ?
                            <Text sx={{ fontSize: '13px', color: 'var(--text-dim)', paddingTop: '4px', }}>
                                Transcript will appear here once you start recording.
                            </Text>
                            :
                            [...transcription].sort((a, b) => a.offset - b.offset).slice(-4).reverse().map((line, i) => (
                                <Box key={i} sx={{
                                    padding: '10px 12px', borderRadius: '8px', background: 'var(--surface)',
                                    boxShadow: 'var(--shadow)', opacity: 1 - i * 0.18,
                                }}>
                                    <Text sx={{ fontSize: '10.5px', color: 'var(--text-dim)', fontFamily: "'JetBrains Mono', ui-monospace, monospace", marginBottom: '3px', }}>
                                        {formatElapsed(line.offset)}
                                    </Text>
                                    <Text sx={{ fontSize: '13px', lineHeight: '1.5', color: 'var(--text)', }}>
                                        {line.text}
                                    </Text>
                                </Box>
                            ))
                        }
                    </Box>
                </Box>
            </Box>

            {/* Input bar */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 28px', borderTop: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0, }}>
                <PlusIcon size={16} color='var(--text-dim)' />
                <input
                    type='text'
                    placeholder='Type a keypoint and press Enter...'
                    className='note-input'
                    style={{ margin: 0, flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: '14.5px', }}
                    value={newPoint}
                    onChange={(e) => setNewPoint(e.target.value)}
                    onKeyDown={event => handleKeyDown(event)}
                />
                <Text sx={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: "'JetBrains Mono', ui-monospace, monospace", }}>↵ Enter</Text>
            </Box>
        </Box>
        </>
    )
}

export default CornellNote
