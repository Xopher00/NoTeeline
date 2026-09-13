import OpenAI from 'openai'
import { NotePoint, TranscriptLine, OnboardingSection } from "../state/noteStore"

const SEED = 1
const WINDOW_SIZE = 20 //20s
const OPEN_AI_KEY = JSON.parse(localStorage.getItem('gptKey'))
export const openai = new OpenAI({ apiKey: 'ollama', baseURL: 'http://localhost:11434/v1', dangerouslyAllowBrowser: true })

export type GPTRequest = {
    point: string;
    transcript: string[];
}

export const expandPoint = (point: NotePoint, transcript: TranscriptLine[]) => {
    let expandedPoint = { point: point.point, transcript: [] as string[] }
    for(var i = 0; i < transcript.length; i++) {
        let tr_offset = transcript[i].offset
        let tr_end = transcript[i].offset + transcript[i].duration
        let right = point.created_at //transcript offsets are already in seconds
        let left = right - WINDOW_SIZE

        //there is partial or full overlapping between point and transcript
        if(!(right < tr_offset) && !(left > tr_end)) {
            expandedPoint.transcript.push(transcript[i].text)
        }
    }

    return expandedPoint
}

// returns points with fraction transcript
export const expandPointWithTranscript = (point: NotePoint, transcript: TranscriptLine[]) => {
    let expandedPoint = { point: point.point, transcript: [] as string[] }
    const limit = point.created_at
    for(var i = 0; i < transcript.length; i++){
        const tr_start = transcript[i].offset

        //taking transcript with start time <= point's creation time
        //In reality, only fraction of that transcript may be used
        if(tr_start <= limit) expandedPoint.transcript.push(transcript[i].text)
    }

    return expandedPoint
}

export const getFormattedPromptString = () => {
    const noteStore = localStorage.getItem('note-store')
    const onboardings = noteStore ? JSON.parse(noteStore).state.onboardings : []

    let takeOnboardingIntoPrompt = true

    if(onboardings.length === 0) takeOnboardingIntoPrompt = false

    const newOnboardings = onboardings.filter((onboarding: OnboardingSection) => 
                    onboarding.note !== "" && onboarding.keypoints.every(keypoint => keypoint !== ""))

    if(newOnboardings.length === 0) takeOnboardingIntoPrompt = false

    let promptString = "I want you to act as a personalized note-taking assistant. Users will give you a keypoint and the youtube transcript. "+
                        "Your task is to expand the keypoint into a note point, by taking additional context from the transcript. The note should be a full sentence in simple english. " +
                        "Follow these rules:\n1. Resolve any typos or grammatical mistakes that arise in the keypoint.\n2. The note should not be longer than 1 sentence. " + 
                        "3. Remember that the keypoint can be very abstract and as short as an abbreviation. Use the transcript to get additional information to ensure a good quality note expansion.\n" +
                        "4. Just write a single note point, users will request repeatedly for new points they want to add.\n" +
                        "5. Write it in a way a user would write in a notepad. Do not use sentences such as 'This video talks about...', 'The speaker explains..' etc.";
    
    if(takeOnboardingIntoPrompt) promptString += "\nMake sure that the note aligns with the user's writing style, so that they can read it easily. Use the same writing style as shown below.\n" + 
                                                 "Here are three examples:\n"

    if(takeOnboardingIntoPrompt){
        for(let i = 0; i < newOnboardings.length; i++){
            promptString += "Transcript: ..."+newOnboardings[i].transcript+"...\n"+
                            "Keypoint: "+newOnboardings[i].keypoints.join(", ")+"\n"+
                            "Note: "+newOnboardings[i].note+"\n\n"
        }

        promptString += "The keypoint refers to the high-level keypoint provided by the user and your task is to write a full 'Note' point. Make sure that your expanded note point matches the writing style of 'Note' in the provided examples."
    }

    return promptString
}

export const genResponses = async (points: {point: string, history: string[], expand: number, created_at: number, utc_time: number, }[], transcription: TranscriptLine[]) => {
    const promptString = getFormattedPromptString()
    const responses = await Promise.all(
      points.map(async (point, idx) => {
        try{
          if(point.history.length > point.expand){
            console.log(`${point.history.length}, ${point.expand}`)
          }else{
            const pointToBeExpanded = point.history[point.expand - 1]
            const expandedPoint = expandPoint({point: pointToBeExpanded, created_at: point.created_at, utc_time: point.utc_time, }, transcription)
            const transcript = expandedPoint.transcript.join(".")
            const PROMPT = "Expand the provided keypoint into a one sentence note.\n" +
                "Transcript: ..." + transcript + "...\n"+
                "Keypoint: "+expandedPoint.point+"\n"+
                "Note:"

          const res = await fetch('http://localhost:11434/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'llama3.1:8b',
              messages: [{ role: 'system', content: promptString}, { role: 'user', content: PROMPT }],
              stream: true,
              temperature: 0.5,
            }),
          })

          const reader = res.body.getReader()
          const decoder = new TextDecoder('utf-8')
          let response = ''

          while(true){
            const chunk = await reader.read()
            const { done, value } = chunk
            if(done){
              break
            }
            const decodedChunk = decoder.decode(value)
            const lines = decodedChunk.split('\n')
            const parsedLines = lines.map(line => line.replace(/^data: /, '').trim()).filter(line => line !== '' && line !== '[DONE]').map(line => JSON.parse(line))

            for (const parsedLine of parsedLines){
              const { choices } = parsedLine
              const { delta } = choices[0]
              const { content } = delta
              if(content){
                response += content
                console.log(`response for prompt ${idx+1}: ${response}`)
              }
            }

            //response += decodedChunk
          }
          return response
         }
        }catch(e){
          console.log('Error ' + e)
        }
      })
    )

    /*responses.forEach((response, index) => {
      console.log(`Response for prompt ${index+1} => ${response}`)
    })*/
  }

export const callGPT = async (points: {point: string, history: string[], expand: number, created_at: number, utc_time: number, }[], transcription: TranscriptLine[]) => {
    const promptString = getFormattedPromptString()
    console.log(openai)
    
    let expansion = [] as any[]
    for(let i = 0; i < points.length; i++){
        const point = points[i]

        if(point.history.length > point.expand){
            expansion.push({point: point.point, expansion: point.history[point.expand], old: true})
        }else{
            const pointToBeExpanded = point.history[point.expand - 1]
            const expandedPoint = expandPoint({point: pointToBeExpanded, created_at: point.created_at, utc_time: point.utc_time, }, transcription)
            const transcript = expandedPoint.transcript.join(".")
            const PROMPT = "Expand the provided keypoint into a one sentence note.\n" +
                "Transcript: ..." + transcript + "...\n"+
                "Keypoint: "+expandedPoint.point+"\n"+
                "Note:"

            //console.log('calling expansion from', PROMPT)

            const res = await openai.chat.completions.create({
                messages: [{ role: "system", content: promptString }, { role: "user", content: PROMPT }],
                model: "llama3.1:8b",
                temperature: 0.5,
            })

            if(res?.choices[0]?.message?.content !== null) expansion.push({point: point.point, expansion: res.choices[0].message.content, old: false})
        }
    }

    return expansion
}

export const callGPTForSinglePoint = async (point: NotePoint, transcription: TranscriptLine[]) => {
    const expandedPoint = expandPoint(point, transcription)
    const transcript = expandedPoint.transcript.join(".")
    
    const promptString = getFormattedPromptString()

    const PROMPT = "Expand the provided keypoint into a one sentence note.\n" +
            "Transcript: ..."+transcript+"...\n"+
            "Summary: "+expandedPoint.point+"\n"+
            "Note:"

    const res = await openai.chat.completions.create({
        messages: [{ role: "system", content: promptString }, { role: "user", content: PROMPT }],
        model: "llama3.1:8b",
        seed: SEED,
        temperature: 0.5,
    })

    if(res?.choices[0]?.message?.content !== null) return res.choices[0].message.content
    else return null
}

export const generatepointsummary = async (points: string, context: string) => {

    const user_prompt =  `I will give you a context and some keypoints, Your task is to summarize the keypoints in 4 sentences. Focus on the keypoint, only use context if you need extra information:
    Context: ${context}
    Keypoints: ${points}
    remember not to make it too long.
    Do not mark the sentences with 1,2 etc.`
    const res = await openai.chat.completions.create({
        messages: [{ role: "user", content: user_prompt }],
        model: "llama3.1:8b",
        seed: SEED,
        temperature: 0.5,
    })

    return res.choices[0].message.content || ""
}

// ToDo: pass the summary here, *the response from the /transcribe-chunk backend call or handleSummary()*
export const generateQuiz = async (points: string[], summary: string) => {
    const system_prompt = 'Given a topic description, Your task is to generate five multichoice question with answer.  ' + 
                          'Please mark the question within <Question></Question> tags,  ' + 
                          'individual choices within <Choice></Choice> tags and answer ' + 
                          'within <Answer></Answer> tags. Make sure not to always put the right choice in the same choice option, ' + 
                          'randomly assign it within A, B, C or D.\n' +
                          'Here is an example: \n' +
                            'Topic: Resilience refers to how well you can deal with and bounce back from the difficulties of life. It can mean the difference between handling pressure and losing your cool. Resilient people tend to maintain a more positive outlook and cope with stress more effectively. Research has shown that while some people seem to come by resilience naturally, these behaviors can also be learned. Whether you\'re going through a tough time now or you want to be prepared for future challenges, you can build resilience by: Finding purpose, Believing in yourself, Developing a social network, Embracing change, Being optimistic, Nurturing yourself, Developing problem-solving skills, Establishing goals, Taking action, Committing to building skills over time.' + 
                            '<Question>What does resilience refer to?</Question>\n' +
                            '<Choice>A. Dealing with difficulties by losing your cool</Choice>\n' +
                            '<Choice>B. Bouncing back from the challenges of life</Choice>\n' +
                            '<Choice>C. Avoiding stressful situations altogether</Choice>\n' +
                            '<Choice>D. Ignoring problems and hoping they go away</Choice>\n' +
                            '<Answer>B. Bouncing back from the challenges of life</Answer>\n' +
                            '<Question>Which of the following is NOT a way to build resilience?</Question>\n' +
                            '<Choice>A. Finding purpose</Choice>\n' +
                            '<Choice>B. Believing in yourself</Choice>\n' +
                            '<Choice>C. Avoiding change at all costs</Choice>\n' +
                            '<Choice>D. Nurturing yourself</Choice>\n' +
                            '<Answer>C. Avoiding change at all costs</Answer>'
    
    let user_prompt =  `Topic: ${points}`
    if(summary !== '') user_prompt += `\nAdditional Context to get extra information for the topic: ${summary}`
    
    const res = await openai.chat.completions.create({
        messages: [{ role: "system", content: system_prompt },
                    { role: "user", content: user_prompt }],
        model: "llama3.1:8b",
        seed: SEED,
        temperature: 0.5,
    })

    return res.choices[0].message.content || ""
}

export const generateTheme = async (expandedPoints: string[]) => {
    const prompt = `Given a list of points, Your task is to perform topic modeling over them. Arrange the points into topics and
    provide a name to each individual topic.  Please mark the topic within <Topic></Topics> tags. the points are marked 
    with <p> tag as well.
    
    Follow these rules:
    1. Each topic should have more than one points.
    2. Every point should be assigned under one topic. No point should be unassigned.
    3. The topic should not be very high-level, make them as detailed as possible.
    
    Here is an example:    
    Input points:
    1. New York City is home to a vibrant mix of cultures, with communities from nearly every corner of the globe, offering an incredible range of languages, cuisines, and cultural practices.
    2. New York is home to some of the world's most famous museums, including The Metropolitan Museum of Art and the Museum of Modern Art (MoMA), which house vast collections of art, historical artifacts, and cultural exhibits.
    3. An iconic Art Deco skyscraper that once held the title of the world's tallest building. It offers breathtaking views of the city from its observation decks.
    4. Known as the heart of the American theatre industry, it offers world-class performances ranging from dramatic plays to lavish musicals.
    5. A historic suspension bridge connecting Manhattan and Brooklyn. Walking across the bridge provides stunning views of the New York skyline and the East River.
    6. The city hosts numerous cultural festivals throughout the year, celebrating everything from Chinese New Year in Chinatown to the West Indian American Day Carnival in Brooklyn, showcasing the city's multicultural heritage.

    Answer:
    <Topic name="Cultural Celebration in New York City">
    <p>New York City is home to a vibrant mix of cultures, with communities from nearly every corner of the globe, offering an incredible range of languages, cuisines, and cultural practices.</p>
    <p>The city hosts numerous cultural festivals throughout the year, celebrating everything from Chinese New Year in Chinatown to the West Indian American Day Carnival in Brooklyn, showcasing the city's multicultural heritage.</p>
    </Topic>
    <Topic name="Iconic Landmarks of New York City">
    <p>An iconic Art Deco skyscraper that once held the title of the world's tallest building. It offers breathtaking views of the city from its observation decks.</p>
    <p>A historic suspension bridge connecting Manhattan and Brooklyn. Walking across the bridge provides stunning views of the New York skyline and the East River.</p>
    </Topic>
    <Topic name="Museum and theatre in New York City">
    <p>Known as the heart of the American theatre industry, it offers world-class performances ranging from dramatic plays to lavish musicals.</p>
    <p>New York is home to some of the world's most famous museums, including The Metropolitan Museum of Art and the Museum of Modern Art (MoMA), which house vast collections of art, historical artifacts, and cultural exhibits.</p>
    </Topic>

    Input points: ` + expandedPoints +
    `\nAnswer: `;
    
    const res = await openai.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "llama3.1:8b",
        seed: SEED,
        temperature: 0.5,
    })

    console.log('theme response', res.choices[0].message.content);

    return res.choices[0].message.content || ""
}
