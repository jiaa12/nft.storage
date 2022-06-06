import {
  createStubbedImageFetcher,
  createStubbedRetrievalMetricsLogger,
  measureNftTimeToRetrievability,
} from './measureNftTimeToRetrievability.js'
import { test } from '../lib/testing.js'
import { createTestImages } from '../bin/nft-ttr.js'
import all from 'it-all'

test('measureNftTimeToRetrievability', async (t) => {
  /** this is meant to be a test that doesn't use the network (e.g. inject stubs) */

  let storeCallCount = 0
  const storer = {
    /** @param {import('nft.storage/dist/src/token').TokenInput} nft */
    store: async (nft) => {
      storeCallCount++
      return {
        ipnft: 'bafybeiarmhq3d7msony7zfq67gmn46syuv6jrc6dagob2wflunxiyaksj4',
        nft,
      }
    },
  }

  let pushCallCount = 0
  const metricsPusher = {
    /** @type {import('./measureNftTimeToRetrievability.js').RetrievalMetricsLogger} */
    push(...args) {
      pushCallCount++
      return createStubbedRetrievalMetricsLogger()(...args)
    },
  }

  const results = await all(
    measureNftTimeToRetrievability({
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      log: () => {},
      images: createTestImages(1),
      gateways: [new URL('https://nftstorage.link')],
      store: (n) => storer.store(n),
      metricsPushGatewayJobName: 'integration-tests',
      pushRetrieveMetrics: (...args) => metricsPusher.push(...args),
      secrets: {
        nftStorageToken: 'TODO',
        metricsPushGatewayAuthorization: { authorization: 'bearer todo' },
      },
      fetchImage: createStubbedImageFetcher(),
    })
  )
  t.assert(results.length > 0)
  t.is(storeCallCount, 1)

  const start = results.find((log) => log.type === 'start')
  t.assert(start)

  const storeLog = results.find((log) => log.type === 'store')
  t.assert(storeLog)

  const retrieve = results.find(
    /** @returns {log is import('./measureNftTimeToRetrievability.js').RetrieveLog} */
    (log) => log.type === 'retrieve'
  )
  t.is(
    typeof retrieve?.duration?.size,
    'number',
    'expected retrieve duration size to be a number'
  )

  // did call pushRetrieveMetrics
  t.is(pushCallCount, 1)

  const finish = results.find((log) => log.type === 'finish')
  t.assert(finish)
})
