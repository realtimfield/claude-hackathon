import axios from 'axios'

// Set base URL for all axios requests
// In production, this will use the same origin as the app
// In development, the Vite proxy will handle /api routes
axios.defaults.baseURL = ''

export default axios