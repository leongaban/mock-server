const express = require('express')
const axios = require("axios")
const cors = require('cors');
const bodyParser = require('body-parser')

// ? Constants
const PORT = 2300
const HOST = '0.0.0.0'
const devTokenUrl = 'https://wsdevinternal.usaa.com/tokens/v1/access-token?party_id=plx8220&actor_id=[[1]]&realm=[[2]]'
const consumerV1 = '/v1/pc/claims/consumer/inf/one-stop-shop/error-reprocessing'
const reprocessorV1 = '/v1/pc/claims/oss/reprocessor'
const reprocessFail = { op: 'REPLACE', path: 'status', value: 'reprocess_failed' };
const reprocessSuccess = { op: 'REPLACE', path: 'status', value: 'success' };
const tingtingErrorUID1 = 'ea42a78c-7051-4036-9491-6d43465cca5d'
const tingtingErrorUID2 = 'ea42a78c-7051-4036-9491-6d43465cca5e'
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
// * https://rintapi.usaa.com/v1/pc/claims/oss/reprocessor/consumer-groups/leontest/events
app.get(`${reprocessorV1}/consumer-groups/leontest/events`, (req, res) => {
    console.log(`GET Events ${reprocessorV1} hit`)
    res.status(200).send(mockEvents)
})

// ? POST
// * http://0.0.0.0:2300/v1/pc/claims/consumer/inf/one-stop-shop/error-reprocessing
app.post(`${consumerV1}`, (req, res) => {
    console.log(`POST Reprocess ${consumerV1} hit`)
    let data = {
        groupName: 'leontest',
        status: 'success'
    }

    if (req.body.errorEventUID === tingtingErrorUID1) {
        data.eventName = 'TingtingTestEvent-1'
        data.eventUID = tingtingErrorUID1
        res.status(200)
    } else if (req.body.errorEventUID === tingtingErrorUID2) {
        data.eventName = 'TingtingTestEvent-2'
        data.eventUID = tingtingErrorUID2
        res.status(500)
    }

    res.send(data)
})

// ? PATCH
// * Happy Path: Patch tingting 1
// * http://0.0.0.0:2300/v1/pc/claims/oss/reprocessor/consumer-groups/leontest/events/ea42a78c-7051-4036-9491-6d43465cca5d
app.patch(`${reprocessorV1}/consumer-groups/leontest/events/${tingtingErrorUID1}/`, (req, res) => {
    req.body.payload = reprocessSuccess
    res.status(200)
    res.send({
        eventUID: tingtingErrorUID1,
        eventName: 'TingtingTestEvent-1',
        groupName: 'leontest',
        status: 'success'
    })
})

// ? PATCH
// ! Sad Path: Patch tingting 2
app.patch(`${reprocessorV1}/consumer-groups/leontest/events/${tingtingErrorUID2}/`, (req, res) => {
    req.body.payload = reprocessFail
    res.status(200)
    res.send({
        eventUID: tingtingErrorUID2,
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
        "usaa-activity": "LEVEL2",
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
