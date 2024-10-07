import express, { Request, response, Response } from 'express'

import { enrichData, sendAnalytics, delay, IngestResponse, ProcessedAsset, Asset } from './services/ingestService'

const app = express()
const PORT = 3000
app.use(express.json())

app.get('/', (req: Request, res: Response) => {
    res.send('Hello from ingest service')
})

app.post('/ingest', async (req: Request, res: Response) => {
    let assets: Asset[] = [...req.body]
    let responsePayload: IngestResponse = {
        assets: [],
        summary: {
            totalAssets: assets.length,
            successfullyEnriched: 0,
            enrichmentFailed: 0,
            analyticsSuccess: 0,
            analyticsFailed: 0
        }
    }

    const processInBatches = async() => {
        let allProcessed: boolean = false

        while(!allProcessed){
            const batchStartTime = Date.now()
            const batchEnriched: any[] = []

            while(Date.now() - batchStartTime < 7000){
                if(assets.length > 0){
                    const asset = assets.shift()
                    if(!asset){
                        return
                    }

                    let processedAsset: ProcessedAsset = {
                        asset,
                        enrichment: { status: 'failure' },
                        analytics: null
                    }

                    const enrichmentResult = await enrichData(asset)

                    if(enrichmentResult.status === 200){
                        processedAsset.enrichment = { status: 'success', enrichedData: enrichmentResult.body}
                        batchEnriched.push({...enrichmentResult.body, ...asset})
                        responsePayload.summary.successfullyEnriched++
                    } else {
                        processedAsset.enrichment = { status: 'failure', errorMessage: `${res.status}`}
                        responsePayload.summary.enrichmentFailed++
                    }

                    responsePayload.assets.push(processedAsset)
                }
                else {
                    await delay(7000 - (Date.now() - batchStartTime))
                    break
                }
            }

            if(batchEnriched.length > 0){
                const data = batchEnriched.map(item => ({
                    id: item.id, 
                    asset: item.asset_name, 
                    ip: item.ip, 
                    category: item.category, 
                    asn: item.asn, 
                    correlationId: item.correlationId
                }))
                const analyticsResult = await sendAnalytics(data)

                if(analyticsResult.status === 200){
                    batchEnriched.forEach((item) => {
                        const assetInResponse = responsePayload.assets.find(a => a.asset.id === item.id)

                        if(assetInResponse){
                            assetInResponse.analytics = { status: 'success'}
                        }

                        responsePayload.summary.analyticsSuccess++
                    })
                    
                } else {
                    batchEnriched.forEach((item) => {
                        const assetInResponse = responsePayload.assets.find(a => a.asset.id === item.id)

                        if(assetInResponse){
                            assetInResponse.analytics = { status: 'failure'}
                        }

                        responsePayload.summary.analyticsFailed++
                    })
                    
                }
            }

            if(assets.length === 0){
                allProcessed = true
            }
        }
         
        res.json(responsePayload)
    }

    await processInBatches()

})

app.listen(PORT, async () => {
    console.log(`Server is running on http://localhost:${PORT}`)
})