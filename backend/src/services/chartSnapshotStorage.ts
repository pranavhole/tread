import { randomUUID } from 'crypto'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'

const storageRoot = path.resolve(process.cwd(), 'storage', 'chart-snapshots')

export async function saveChartImage(image: string) {
  const match = image.match(/^data:image\/png;base64,(.+)$/)
  if (!match) {
    throw new Error('image must be a base64 PNG data URL')
  }

  await mkdir(storageRoot, { recursive: true })

  const fileName = `${randomUUID()}.png`
  const filePath = path.join(storageRoot, fileName)
  await writeFile(filePath, Buffer.from(match[1], 'base64'))

  return `/chart-snapshots/${fileName}`
}
