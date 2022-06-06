import { test } from '../lib/testing.js'
import { main as binNftTtr } from './nft-ttr.js'
import { recordedLog } from '../lib/log.js'
import {
  createStubbedImageFetcher,
  createStubStoreFunction,
} from '../jobs/measureNftTimeToRetrievability.js'
import all from 'it-all'

const defaultTestMinImageSizeBytes = 10 * 1e6

test(`bin/nft-ttr works with --minImageSizeBytes=${defaultTestMinImageSizeBytes} and multiple gateways`, async (t) => {
  const { log } = recordedLog()
  const minImageSizeBytes = defaultTestMinImageSizeBytes
  const gateways = ['https://nftstorage.link', 'https://dweb.link']
  const command = [
    'fakeNodePath',
    'fakeScriptPath',
    'measure',
    `--minImageSizeBytes=${minImageSizeBytes}`,
    `--gateways=${gateways.join(' ')}`,
  ]
  const activities = await all(
    binNftTtr(command, {
      log,
      store: createStubStoreFunction(),
      fetchImage: createStubbedImageFetcher(minImageSizeBytes),
    })
  )
  let retrieveCount = 0
  const gatewaysNeedingRetrieval = new Set(gateways)
  for (const activity of activities) {
    if (activity.type !== 'retrieve') {
      continue
    }
    const retrieve = activity
    retrieveCount++
    t.assert(retrieve)
    t.is(
      typeof retrieve.duration.size,
      'number',
      'expected retrieve duration size to be a number'
    )
    t.assert(retrieve.contentLength > minImageSizeBytes)
    for (const gateway of gatewaysNeedingRetrieval) {
      if (retrieve.url.toString().startsWith(gateway)) {
        gatewaysNeedingRetrieval.delete(gateway)
        break
      }
    }
  }
  t.is(gatewaysNeedingRetrieval.size, 0)
  t.is(retrieveCount, gateways.length)
})
