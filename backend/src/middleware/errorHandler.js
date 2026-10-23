import { config } from '../config/env.js'

export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode ||
    (err.name === 'MulterError'
      ? err.code === 'LIMIT_FILE_SIZE' ? 413 : 400
      : res.statusCode === 200 ? 500 : res.statusCode)

  console.error(`[Error] ${req.method} ${req.originalUrl}:`, err.message)

  res.status(statusCode).json({
    error: err.message || 'Internal Server Error',
    success: false,
    message: err.message || 'Internal Server Error',
    stack: config.nodeEnv === 'development' ? err.stack : undefined,
  })
}
