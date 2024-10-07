import axios from 'axios'

export interface IngestResponse {
    assets: ProcessedAsset[];
    summary: {
        totalAssets: number;
        successfullyEnriched: number;
        enrichmentFailed: number;
        analyticsSuccess: number;
        analyticsFailed: number;
    };
}

export interface ProcessedAsset {
    asset: Asset;
    enrichment: EnrichmentResult;
    analytics: AnalyticsResult | null; // Analytics will only be attempted if enrichment succeeds
}

export interface Asset {
    id: string;
    asset_name: string;
    ip: string;
    created_utc: string;
    source: string;
    category: string;
}

interface EnrichmentResult {
    status: 'success' | 'failure';
    enrichedData?: EnrichedData; // Available if status is 'success'
    errorMessage?: string;       // Available if status is 'failure'
}

interface EnrichedData {
    asn: string;
    category: string;
    correlationId: number;
}

interface AnalyticsResult {
    status: 'success' | 'failure';
}

export const enrichData = async (data: any) => {
    try {
        const axiosConfig = {
            method: 'post',
            url: 'https://api.heyering.com/enrichment',
            data: {
                id: data.id,
                asset: data.asset,
                ip: data.ip,
                category: data.category
            },
            headers: {
                Authorization: `eye-am-hiring`,
            }
        }
        //TODO: move Authorization to env variable

        const response = await axios.request(axiosConfig)
        return { status: response.status, body: response.data }
    } catch (error) {
        console.error('Error enriching data:', error) // Better error logging
        return { status: '500', body: 'There was an error!' }
    }
}

export const sendAnalytics = async (data: any[]) => {
    try {
        const axiosConfig = {
            method: 'post',
            url: 'https://api.heyering.com/analytics',
            data,
            headers: {
                Authorization: `eye-am-hiring`,
            }
        }

        //TODO: move Authorization to env variable

        const response = await axios.request(axiosConfig)
        return { status: response.status, body: response.data }
    } catch (error) {
        console.error('Error sending analytics:', error)
        return { status: '500', body: 'There was an error!' }
    }
}

export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
