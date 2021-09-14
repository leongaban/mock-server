const express = require('express')
const axios = require("axios")
const cors = require('cors');
const bodyParser = require('body-parser')

// ? Constants
const PORT = 2300
const HOST = '0.0.0.0'
const consumerV1 = '/v1/consumer'
const reprocessorV1 = '/v1/reprocessor'
const reprocessFail = { op: 'REPLACE', path: 'status', value: 'reprocess_failed' };
const reprocessSuccess = { op: 'REPLACE', path: 'status', value: 'success' };
const errorUID1 = 'ea42a78c-7051-4036-9491'
const errorUID2 = 'ty56a78c-1366-7780-6969'
const mockEvents = require('./data/events.json')

// App
const app = express()
// const constants = require('./constants')

app.use(cors())
app.use(bodyParser.urlencoded({ extended: true })) 
app.use(bodyParser.json())

// Allow cross origin XHR calls
app.use((req, res, next) => {
    let origin = req.get('origin') || req.protocol + '://' + req.hostname
    let additionalHeaders = ''
    let requestedHeaders = req.header('Access-Control-Request-Headers')

    if ('OPTIONS' === req.method && requestedHeaders !== undefined && requestedHeaders.length > 0) {
        additionalHeaders = ', ' + requestedHeaders
    }

    res.header('Access-Control-Allow-Origin', origin)
    res.header(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept, Access-Control-Allow-Origin, Authorization' +
        additionalHeaders
    )
    res.header('Access-Control-Allow-Credentials', 'true')
    res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS, PUT, PATCH, DELETE')

    next()
})

app.get('/', (req, res) => {
    console.log(`Hi from Kafka Reprocess mock server!`)
    res.send('Hi from Kafka Reprocess mock server!\n')
})

// ? GET Consumer Groups
app.get(`${reprocessorV1}/consumer-groups`, (req, res) => {
    console.log(`GET consumerGroups ${reprocessorV1} hit`)
    res.status(200).send(['leontest'])
})

// ? GET Events
app.get(`${reprocessorV1}/consumer-groups/leontest/events`, (req, res) => {
    console.log(`GET Events ${reprocessorV1} hit`)
    res.status(200).send(mockEvents)
})

// ? POST
app.post(`${consumerV1}`, (req, res) => {
    console.log(`POST Reprocess ${consumerV1} hit`)
    let data = {
        groupName: 'leontest',
        status: 'success'
    }

    if (req.body.errorEventUID === errorUID1) {
        data.eventName = 'TingtingTestEvent-1'
        data.eventUID = errorUID1
        res.status(200)
    } else if (req.body.errorEventUID === errorUID2) {
        data.eventName = 'TingtingTestEvent-2'
        data.eventUID = errorUID2
        res.status(500)
    }

    res.send(data)
})

// ? PATCH
// * Happy Path: Patch tingting 1
app.patch(`${reprocessorV1}/consumer-groups/leontest/events/${errorUID1}/`, (req, res) => {
    req.body.payload = reprocessSuccess
    res.status(200)
    res.send({
        eventUID: errorUID1,
        eventName: 'TingtingTestEvent-1',
        groupName: 'leontest',
        status: 'success'
    })
})

// ? PATCH
// ! Sad Path
app.patch(`${reprocessorV1}/consumer-groups/leontest/events/${errorUID2}/`, (req, res) => {
    req.body.payload = reprocessFail
    res.status(200)
    res.send({
        eventUID: errorUID2,
        eventName: 'TingtingTestEvent-2',
        groupName: 'leontest',
        status: 'reprocess failed'
    })
})

// * all the missing routes
app.use('*', (req, res, next) =>{ 

axios({
    method: req.method,
    data: req.body,
    headers: {
        "Content-Type": "application/json"
        }
    })
    .then(response => res.status(200).send(response.data))
    .catch(error => {
        const response = error.response || {}
        res.status(response.status || 500).send(response.data)
    })
})

app.listen(PORT, HOST)
console.log(`Running on http://${HOST}:${PORT}`)
