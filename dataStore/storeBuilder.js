// Node Modules
const path = require('node:path')

// Local Modules
const {Storage} = require('./storage.js')
const {DataStore} = require('./dataStore.js')

const dataStore = new DataStore(
    new Storage(
        path.join(__dirname, '../../dataStore'), 
        require('node:fs').promises
    )
)

dataStore.assignStoreDriver(
    'storeNewsletterEmail', 
    data => fillDataValues(data,
        getStoreSchema('newsletter'), 
        {generatedValues: false}
    ), 
    getStoreSchema('newsletter')
)

dataStore.assignStoreDriver(
    'storeOrgRecord', 
    data => fillDataValues(data,
        getStoreSchema('org'),
        {generatedValues: true}
    ), 
    getStoreSchema('org')
)

dataStore.assignStoreDriver(
    'storeSoleRecord', 
    data => fillDataValues(data,
        getStoreSchema('sole'),
        {generatedValues: true}
    ), 
    getStoreSchema('sole')
)

dataStore.setPrivateKeys(getStoreSchema('private'))

function fillDataValues(data, schema, config) {
    const refinedData = {}

    if (config.generatedValues) {
        const generatedValues = getStoreSchema('generatedValues')
        schema.forEach(value => {
            (value === 'id') && !(refinedData[value] = undefined);
            (value === 'services') && (refinedData[value] = [data[value]]);
            
            if (!data[value]) {
                refinedData[value] = generatedValues[value]
            }

            else refinedData[value] = data[value]
        })
    }

    else {
        schema.forEach(value => {
            (value === 'id') && !(refinedData[value] = undefined)
            refinedData[value] = data[value]
        })
    }

    return refinedData
}

function getStoreSchema(keyword) {
    if (keyword === 'org') {
        return [
            'id', 'name', 'hotline', 'email', 'state', 'category', 
            'service_charge', 'location', 'website', 'about', 'password', 
            'image', 'requests', 'clicks', 'views', 'date', 'services'
        ]
    }

    if (keyword === 'sole') {
        return [
            'id', 'fname', 'lname', 'gender', 'hotline', 'email', 'state', 
            'category', 'profession', 'service_charge', 'charge_fee', 
            'negotiation', 'location', 'website', 'about', 'password', 
            'image', 'requests', 'clicks', 'views', 'date', 'services'
        ]
    }

    if (keyword === 'private') {
        return [
            'hotline', 'password', 'requests', 
            'clicks', 'views', 'date'
        ]
    }

    if (keyword === 'newsletter') {
        return ['id', 'email']
    }

    if (keyword === 'generatedValues') {
        return {
            'requests': 0,
            'clicks': 0,
            'views': 0,
            'date': new Date()
        }
    }
}

module.exports = {dataStore}