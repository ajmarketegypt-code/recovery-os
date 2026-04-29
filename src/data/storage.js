const K = {
  journeyStart: 'ros_journey_start',
  dayLogs: 'ros_day_logs',
  settings: 'ros_settings',
  callLog: 'ros_call_log',
  baselines: 'ros_baselines',
}

const read = (key) => {
  try { return JSON.parse(localStorage.getItem(key)) } catch { return null }
}
const write = (key, val) => localStorage.setItem(key, JSON.stringify(val))

export const getJourneyStart = () => read(K.journeyStart)
export const setJourneyStart = (isoDate) => write(K.journeyStart, isoDate)

const DEFAULT_DAY_LOG = {
  energy: null, sleepQuality: null, workoutDone: false,
  effortRating: null, anchorDone: false, protocol: null,
}

export const getDayLog = (isoDate) => {
  const logs = read(K.dayLogs) ?? {}
  return { ...DEFAULT_DAY_LOG, ...(logs[isoDate] ?? {}) }
}

export const setDayLog = (isoDate, partial) => {
  const logs = read(K.dayLogs) ?? {}
  logs[isoDate] = { ...DEFAULT_DAY_LOG, ...(logs[isoDate] ?? {}), ...partial }
  write(K.dayLogs, logs)
}

const DEFAULT_SETTINGS = { bedTime: '23:30', wakeTime: '07:00', reminderTime: '08:00' }

export const getSettings = () => ({ ...DEFAULT_SETTINGS, ...(read(K.settings) ?? {}) })
export const setSettings = (partial) => write(K.settings, { ...getSettings(), ...partial })

export const getCallLog = (isoDate) => {
  const log = read(K.callLog) ?? {}
  return log.date === isoDate ? (log.count ?? 0) : 0
}

export const incrementCallLog = (isoDate) => {
  const count = getCallLog(isoDate)
  write(K.callLog, { date: isoDate, count: count + 1 })
}

const DEFAULT_BASELINES = { pushUpMax: null, plankSec: null, treadmillNote: null }
export const getBaselines = () => ({ ...DEFAULT_BASELINES, ...(read(K.baselines) ?? {}) })
export const setBaselines = (data) => write(K.baselines, { ...getBaselines(), ...data })
