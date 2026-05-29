import express from 'express'
import { randomUUID } from 'crypto'
import { prisma } from '../config/db.js'
import { saveChartImage } from '../services/chartSnapshotStorage.js'

type SaveChartPayload = {
  userId?: string
  image?: string
  drawings?: unknown
  timestamp?: string
}

export const chartSnapshotsRouter = express.Router()

chartSnapshotsRouter.post('/save-chart', async (req, res) => {
  const payload = req.body as SaveChartPayload

  if (!payload.userId || typeof payload.userId !== 'string') {
    res.status(400).json({ error: 'userId is required' })
    return
  }

  if (!payload.image || typeof payload.image !== 'string') {
    res.status(400).json({ error: 'image is required' })
    return
  }

  try {
    const imageUrl = await saveChartImage(payload.image)
    const createdAt = payload.timestamp ? new Date(payload.timestamp) : new Date()

    if (Number.isNaN(createdAt.getTime())) {
      res.status(400).json({ error: 'timestamp must be an ISO date string' })
      return
    }

    const id = randomUUID()
    const rows = await prisma.$queryRawUnsafe<Array<{ id: string; imageUrl: string; createdAt: Date }>>(
      'INSERT INTO "ChartSnapshot" ("id", "userId", "imageUrl", "drawings", "createdAt") VALUES ($1, $2, $3, $4::jsonb, $5) RETURNING "id", "imageUrl", "createdAt"',
      id,
      payload.userId,
      imageUrl,
      JSON.stringify(payload.drawings ?? []),
      createdAt
    )

    res.status(201).json({
      id: rows[0]?.id,
      imageUrl: rows[0]?.imageUrl ?? imageUrl,
      createdAt: rows[0]?.createdAt ?? createdAt,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to save chart snapshot'
    res.status(500).json({ error: message })
  }
})
