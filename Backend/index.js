const express = require('express')
const axios = require('axios')
const bodyParser = require('body-parser')
const cors = require('cors')
const multer = require('multer')
const upload = multer()

const app = express()

app.use(bodyParser.json())
app.use(cors())

app.get('/', (req, res) => {
    res.send(`Server is running on port ${process.env.PORT || 4000}`)
})

app.post('/transcribe-chunk', upload.single('audio'), async (req, res) => {
    try {
        const FormData = require('form-data')
        const form = new FormData()
        form.append('file', req.file.buffer, { filename: 'chunk.webm' })
        const response = await axios.post('http://localhost:8000/transcribe', form, {
            headers: form.getHeaders(),
        })
        res.json(response.data)
    } catch (error) {
        res.status(500).json({ error: `Problem with transcription: ${error.message}` })
    }
})

app.post('/summary-note-transcript', (req, res) => {
    const requestData = req.body

    if (!requestData || typeof requestData !== 'object') {
        res.status(400).json({ error: 'Bad Request: Please provide a JSON object in the request body.' })
     }else{
        const points = requestData.points

        //extend code here...
     }
})

app.listen(process.env.PORT || 4000, () => {
    console.log(`Server listening at http://localhost:${process.env.PORT || 4000}`)
})
