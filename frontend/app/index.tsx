import React, { useEffect, useState, useCallback, useMemo, useRef } from "react"

import { StatusBar } from "expo-status-bar"

import {
  Text,
  View,
  Pressable,
  ScrollView,
  RefreshControl,
  TextInput,
  ActivityIndicator,
  Animated,
  Easing,
  Linking,
  Image,
  Modal,
  Platform,
  Keyboard,
  KeyboardAvoidingView,
} from "react-native"

import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context"

import * as ImagePicker from "expo-image-picker"

import * as SplashScreen from "expo-splash-screen"

import * as Speech from "expo-speech"

import {
  useAudioPlayer,
  useAudioStream,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from "expo-audio"

import { THEME } from "../constants/theme"

import { VoiceWave } from "../components/VoiceWave"

import { AppIcon } from "../components/AppIcon"

import { MumeLogo } from "../components/MumeLogo"

import { api, LinkedPage } from "../lib/api"

import { supabase } from "../lib/supabase"
import { extractSendToCustomerText, parseSendToCustomer, findConvoByName } from "../lib/sendIntent"

import { styles } from "./index.styles"

const FRUIT_IMAGES = {
  apple: require("../assets/apple.jpg"),

  mango: require("../assets/mango.jpg"),

  banana: require("../assets/banana.jpg"),
}

type Tab = "today" | "inbox" | "catalog" | "settings"

type VoiceState = "idle" | "listening" | "thinking"

interface Product {
  id: string

  name: string

  price: string

  stock: "In stock" | "Low stock" | "Out of stock"

  isStock: boolean

  imageKey: "apple" | "mango" | "banana" | "custom"

  imageUri?: string
}

const INITIAL_PRODUCTS: Product[] = [
  {
    id: "prod-1",

    name: "Red apples",

    price: "$2.50 / kg",

    stock: "In stock",

    isStock: true,

    imageKey: "apple",
  },

  {
    id: "prod-2",

    name: "Carabao mango",

    price: "$4.00 / kg",

    stock: "In stock",

    isStock: true,

    imageKey: "mango",
  },

  {
    id: "prod-3",

    name: "Lakatan banana",

    price: "$1.80 / kg",

    stock: "Low stock",

    isStock: false,

    imageKey: "banana",
  },
]

interface ChatMessage {
  id: string

  sender: "user" | "mume"

  text: string

  time: string

  audioUri?: string
}

function VoiceNotePlayer({ uri }: { uri: string }) {
  const player = useAudioPlayer(uri)

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Play voice note"
      onPress={() => {
        try {
          player.seekTo(0)

          player.play()
        } catch {
          // Playback is best-effort only.
        }
      }}
      style={{
        marginTop: 6,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
      }}
    >
      <AppIcon
        name="audio-waveform"
        size={16}
        color="#FFFFFF"
        strokeWidth={2}
      />
      <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "700" }}>
        Play voice note
      </Text>
    </Pressable>
  )
}

function getMumeAiReply(query: string): string {
  const q = query.toLowerCase().trim()

  if (q.includes("apple") || q.includes("mansanas")) {
    return "Red apples are $2.50/kg. In stock."
  }

  if (q.includes("mango") || q.includes("manga")) {
    return "Carabao mango is $4.00/kg. In stock."
  }

  if (q.includes("banana") || q.includes("saging")) {
    return "Lakatan banana is $1.80/kg. Low stock."
  }

  if (
    q.includes("maria") ||
    q.includes("approval") ||
    q.includes("draft") ||
    q.includes("approve")
  ) {
    return "Maria A. waits for a reply on red apples ($2.50/kg)."
  }

  if (
    q.includes("message") ||
    q.includes("inbox") ||
    q.includes("inquir") ||
    q.includes("customer")
  ) {
    return "You have 2 new messages: Maria A. and Jun L."
  }

  if (
    q.includes("price") ||
    q.includes("catalog") ||
    q.includes("inventory") ||
    q.includes("stock")
  ) {
    return "3 items: red apples $2.50/kg, mango $4.00/kg, banana $1.80/kg."
  }

  if (
    q.includes("magkano") ||
    q.includes("kumusta") ||
    q.includes("meron") ||
    q.includes("salamat") ||
    q.includes("po")
  ) {
    return "Hello! Maria A. waits for a reply on red apples ($2.50/kg)."
  }

  if (
    q.includes("hi") ||
    q.includes("hello") ||
    q.includes("hey") ||
    q.includes("mume")
  ) {
    return "Hi Jefferson! I'm Mume. Ask me about prices, stock, or messages."
  }

  if (
    q.includes("yes send") ||
    q.includes("send it") ||
    q.includes("send them") ||
    q.includes("go ahead") ||
    q === "yes" ||
    q.includes("approve") ||
    q.includes("sige") ||
    q.includes("reply")
  ) {
    console.warn(
      "[chat] Confirmation received while offline; nothing was sent.",
    )
  }

  return "Noted. Ask me about prices, stock, or customer messages."
}

/**
 * Decodes the first `count` bytes of a base64 string without atob,
 * so header checks work on every runtime (Hermes included).
 */

function decodeBase64Head(b64: string, count: number): number[] {
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"

  const clean = b64.replace(/[^A-Za-z0-9+/=]/g, "")

  const out: number[] = []

  for (let i = 0; i + 4 <= clean.length && out.length < count; i += 4) {
    const sextets = [clean[i], clean[i + 1], clean[i + 2], clean[i + 3]].map(
      (ch) => (ch === "=" ? 0 : alphabet.indexOf(ch)),
    )

    out.push((sextets[0] << 2) | (sextets[1] >> 4))

    if (out.length < count && clean[i + 2] !== "=")
      out.push(((sextets[1] & 15) << 4) | (sextets[2] >> 2))

    if (out.length < count && clean[i + 3] !== "=")
      out.push(((sextets[2] & 3) << 6) | sextets[3])
  }

  return out.slice(0, count)
}

/**
 * Normalizes Android single-slash file URLs (`file:/data/...` produced by
 * `java.io.File.toURI().toURL()`) into standard `file:///data/...` URIs.
 */

function normalizeFileUri(uri: string): string {
  return String(uri || "").replace(/^file:\/(?!\/)/i, "file:///")
}

/**
 * Converts a raw PCM ArrayBuffer emitted by `useAudioStream`'s `onBuffer`
 * callback into mono Float32 samples in [-1, 1].
 */

function pcmBufferToMonoFloat32(
  data: ArrayBuffer,

  channels = 1,

  encoding: "int16" | "float32" = "int16",
): Float32Array {
  if (!data || data.byteLength === 0) return new Float32Array(0)

  const bytes = ArrayBuffer.isView(data)
    ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
    : new Uint8Array(data)

  const ch = Math.max(1, channels || 1)

  const bytesPerSample = encoding === "float32" ? 4 : 2

  const frames = Math.floor(bytes.byteLength / (ch * bytesPerSample))

  if (frames <= 0) return new Float32Array(0)

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)

  const out = new Float32Array(frames)

  for (let f = 0; f < frames; f++) {
    let sum = 0

    for (let c = 0; c < ch; c++) {
      const off = (f * ch + c) * bytesPerSample

      const sample =
        encoding === "float32"
          ? view.getFloat32(off, true)
          : view.getInt16(off, true) / 32768

      sum += sample
    }

    out[f] = Math.max(-1, Math.min(1, sum / ch))
  }

  return out
}

/**
 * Reads a recorded audio file URI into base64 for the transcription endpoint.
 * Refuses to return non-audio bytes: a missing/unreadable file can surface
 * as an error page (e.g. the text "File not found"), which must never be
 * uploaded as if it were a recording.
 */

async function uriToBase64(
  uri: string,
): Promise<{ base64: string, mimeType: string }> {
  const res = await fetch(normalizeFileUri(uri))

  if (typeof res.status === "number" && res.status >= 400) {
    throw new Error(`Failed to read recording (HTTP ${res.status})`)
  }

  const blob = await res.blob()

  if (!blob || blob.size === 0) {
    throw new Error("Failed to read recording")
  }

  const dataUrl: string = await new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onerror = () => reject(new Error("Failed to read recording"))

    reader.onload = () => resolve(String(reader.result))

    reader.readAsDataURL(blob)
  })

  const comma = dataUrl.indexOf(",")

  const header = comma >= 0 ? dataUrl.slice(0, comma) : ""

  const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : ""

  const mime = /data:(.*?);base64/.exec(header)?.[1] || "audio/wav"

  if (!base64) throw new Error("Failed to read recording")

  // Never upload something that is not WAV bytes. Checks the 44-byte

  // header magic (RIFF....WAVE) from the encoded payload directly.

  const head = decodeBase64Head(base64, 12)

  const tag = (offset: number) =>
    String.fromCharCode(
      head[offset] || 0,
      head[offset + 1] || 0,
      head[offset + 2] || 0,
      head[offset + 3] || 0,
    )

  if (base64.length < 60 || tag(0) !== "RIFF" || tag(8) !== "WAVE") {
    throw new Error("That recording didn't save properly — try again.")
  }

  return { base64, mimeType: mime }
}

/** Handle for an in-progress browser microphone capture. */

interface WebCapture {
  ctx: AudioContext

  source: MediaStreamAudioSourceNode

  proc: ScriptProcessorNode

  chunks: Float32Array[]

  sampleRate: number

  micStream: MediaStream

  recognition?: any

  getBrowserTranscript?: () => string
}

/**
 * Browser fallback: expo-audio streams are not available on web
 * (useAudioStream returns a null stream), so capture raw PCM with the
 * Web Audio API instead. The caller stops it with stopWebCapture.
 */

async function startWebCapture(): Promise<WebCapture> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Microphone is not available in this browser")
  }

  let micStream: MediaStream

  try {
    micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,

        noiseSuppression: true,

        autoGainControl: true,
      },
    })
  } catch {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true })
  }

  const liveTrack = micStream.getAudioTracks()[0]

  if (!liveTrack || liveTrack.readyState !== "live") {
    micStream.getTracks().forEach((t) => t.stop())

    throw new Error("Microphone is not available in this browser")
  }

  const Ctor = window.AudioContext || (window as any).webkitAudioContext

  const ctx: AudioContext = new Ctor()

  // The context is created after an await, so the browser may start it

  // suspended (no user gesture). Without resume(), onaudioprocess never

  // fires and the capture is silently empty.

  try {
    await ctx.resume()
  } catch {
    // resume() itself failing means capture cannot proceed.
  }

  if (ctx.state !== "running") {
    micStream.getTracks().forEach((t) => t.stop())

    try {
      await ctx.close()
    } catch {
      /* already closed */
    }

    throw new Error("Microphone is not available in this browser")
  }

  const source = ctx.createMediaStreamSource(micStream)

  const proc = ctx.createScriptProcessor(4096, 1, 1)

  const chunks: Float32Array[] = []

  proc.onaudioprocess = (e) => {
    chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)))
  }

  source.connect(proc)

  // Keep the processor clocked via the destination without feeding the live

  // mic back through the speakers (zero gain = no feedback howl).

  const silent = ctx.createGain()

  silent.gain.value = 0

  proc.connect(silent)

  silent.connect(ctx.destination)

  // Best-effort browser SpeechRecognition on desktop web as a fallback

  // if the backend ASR endpoint is unreachable.

  let recognition: any = null

  const finalParts: string[] = []

  let interimPart = ""

  try {
    const isMobileUa = /Android|iPhone|iPad|iPod/i.test(
      navigator.userAgent || "",
    )

    const SpeechRec =
      !isMobileUa &&
      ((window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition)

    if (SpeechRec) {
      recognition = new SpeechRec()

      recognition.continuous = true

      recognition.interimResults = true

      recognition.lang = "en-US"

      recognition.onresult = (ev: any) => {
        let interim = ""

        for (let i = ev.resultIndex || 0; i < ev.results.length; i++) {
          const res = ev.results[i]

          const txt = String(res?.[0]?.transcript || "").trim()

          if (!txt) continue

          if (res.isFinal) finalParts.push(txt)
          else interim += (interim ? " " : "") + txt
        }

        interimPart = interim
      }

      recognition.onerror = () => {}

      recognition.start()
    }
  } catch {
    recognition = null
  }

  return {
    ctx,

    source,

    proc,

    chunks,

    sampleRate: ctx.sampleRate,

    micStream,

    recognition,

    getBrowserTranscript: () =>
      [...finalParts, interimPart].filter(Boolean).join(" ").trim(),
  }
}

/**
 * Decodes a base64 string into bytes without atob,
 * so it works on every runtime (Hermes included).
 */

function decodeBase64ToBytes(b64: string): Uint8Array {
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"

  const clean = b64.replace(/[^A-Za-z0-9+/=]/g, "")

  const out: number[] = []

  for (let i = 0; i + 4 <= clean.length; i += 4) {
    const a = alphabet.indexOf(clean[i])

    const b = alphabet.indexOf(clean[i + 1])

    const c = clean[i + 2] === "=" ? 0 : alphabet.indexOf(clean[i + 2])

    const d = clean[i + 3] === "=" ? 0 : alphabet.indexOf(clean[i + 3])

    out.push((a << 2) | (b >> 4))

    if (clean[i + 2] !== "=") out.push(((b & 15) << 4) | (c >> 2))

    if (clean[i + 3] !== "=") out.push(((c & 3) << 6) | d)
  }

  return new Uint8Array(out)
}

/**
 * Parses recorded WAV bytes into mono float PCM plus the true sample rate.
 * Rejects non-audio payloads and unsupported shapes with a retryable error.
 */

function wavToMonoFloat32(
  bytes: Uint8Array,
): { pcm: Float32Array, sampleRate: number } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)

  const tag = (o: number) =>
    String.fromCharCode(
      bytes[o] || 0,
      bytes[o + 1] || 0,
      bytes[o + 2] || 0,
      bytes[o + 3] || 0,
    )

  if (bytes.length < 44 || tag(0) !== "RIFF" || tag(8) !== "WAVE") {
    throw new Error("That recording didn't save properly — try again.")
  }

  let offset = 12

  let audioFormat = 0

  let channels = 0

  let sampleRate = 0

  let bits = 0

  let dataStart = -1

  let dataLen = 0

  while (offset + 8 <= bytes.length) {
    const id = tag(offset)

    const size = view.getUint32(offset + 4, true)

    if (id === "fmt ") {
      audioFormat = view.getUint16(offset + 8, true)

      channels = view.getUint16(offset + 10, true)

      sampleRate = view.getUint32(offset + 12, true)

      bits = view.getUint16(offset + 22, true)
    } else if (id === "data") {
      dataStart = offset + 8

      dataLen = size

      break
    }

    offset += 8 + size
  }

  const supported =
    dataStart >= 0 &&
    channels >= 1 &&
    channels <= 2 &&
    sampleRate >= 8000 &&
    sampleRate <= 96000 &&
    ((audioFormat === 1 && (bits === 8 || bits === 16)) ||
      (audioFormat === 3 && bits === 32))

  if (!supported) {
    throw new Error("That recording didn't save properly — try again.")
  }

  const bytesPerSample = bits / 8

  const frames = Math.floor(dataLen / (channels * bytesPerSample))

  const pcm = new Float32Array(frames)

  for (let f = 0; f < frames; f++) {
    let sum = 0

    for (let c = 0; c < channels; c++) {
      const o = dataStart + (f * channels + c) * bytesPerSample

      let sample = 0

      if (audioFormat === 1 && bits === 16)
        sample = view.getInt16(o, true) / 32768
      else if (audioFormat === 1 && bits === 8)
        sample = (view.getUint8(o) - 128) / 128
      else sample = view.getFloat32(o, true)

      sum += sample
    }

    pcm[f] = Math.max(-1, Math.min(1, sum / channels))
  }

  return { pcm, sampleRate }
}

/**
 * Resamples captured browser audio to 24 kHz mono 16-bit PCM and encodes
 * a WAV file as base64: the exact format the transcription endpoint takes.
 */

function encodeWavBase64(
  chunks: Float32Array[],
  fromRate: number,
  toRate = 24000,
): string {
  let total = 0

  for (const c of chunks) total += c.length

  const pcm = new Float32Array(total)

  let o = 0

  for (const c of chunks) {
    pcm.set(c, o)

    o += c.length
  }

  const outLen = Math.max(1, Math.floor((total * toRate) / fromRate))

  const data = new Int16Array(outLen)

  for (let i = 0; i < outLen; i++) {
    const pos = (i * fromRate) / toRate

    const i0 = Math.floor(pos)

    const frac = pos - i0

    const a = pcm[Math.min(i0, total - 1)] || 0

    const b = pcm[Math.min(i0 + 1, total - 1)] || 0

    const v = Math.max(-1, Math.min(1, a + (b - a) * frac))

    data[i] = v < 0 ? Math.round(v * 32768) : Math.round(v * 32767)
  }

  const buffer = new ArrayBuffer(44 + outLen * 2)

  const v = new DataView(buffer)

  const writeStr = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i))
  }

  writeStr(0, "RIFF")

  v.setUint32(4, 36 + outLen * 2, true)

  writeStr(8, "WAVE")

  writeStr(12, "fmt ")

  v.setUint32(16, 16, true)

  v.setUint16(20, 1, true)

  v.setUint16(22, 1, true)

  v.setUint32(24, toRate, true)

  v.setUint32(28, toRate * 2, true)

  v.setUint16(32, 2, true)

  v.setUint16(34, 16, true)

  writeStr(36, "data")

  v.setUint32(40, outLen * 2, true)

  new Int16Array(buffer, 44).set(data)

  const bytes = new Uint8Array(buffer)

  const CH = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"

  let out = ""

  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i]

    const b = i + 1 < bytes.length ? bytes[i + 1] : 0

    const c = i + 2 < bytes.length ? bytes[i + 2] : 0

    out += CH[a >> 2] + CH[((a & 3) << 4) | (b >> 4)]

    out += i + 1 < bytes.length ? CH[((b & 15) << 2) | (c >> 6)] : "="

    out += i + 2 < bytes.length ? CH[c & 63] : "="
  }

  return out
}

/** Stops a browser capture started with startWebCapture and returns base64 WAV + any browser transcript. */

async function stopWebCapture(
  cap: WebCapture,
): Promise<{ base64: string, browserTranscript: string }> {
  try {
    cap.proc.disconnect()
  } catch {
    // Already torn down.
  }

  try {
    cap.source.disconnect()
  } catch {
    // Already torn down.
  }

  try {
    cap.micStream.getTracks().forEach((t) => t.stop())
  } catch {
    // Tracks already stopped.
  }

  if (cap.recognition) {
    await new Promise<void>((resolve) => {
      const done = () => resolve()

      const timer = setTimeout(done, 250)

      try {
        cap.recognition.onend = () => {
          clearTimeout(timer)

          done()
        }

        cap.recognition.stop()
      } catch {
        clearTimeout(timer)

        done()
      }
    })
  }

  const base64 = encodeWavBase64(cap.chunks, cap.sampleRate)

  cap.ctx.close().catch(() => {})

  const browserTranscript = cap.getBrowserTranscript
    ? cap.getBrowserTranscript()
    : ""

  return { base64, browserTranscript }
}

// Demo conversations — NEVER deleted. Real synced Facebook conversations

// are prepended on top of these by loadRealInbox, never replacing them.

const DUMMY_CONVOS = [
  {
    id: "1",
    initials: "MA",
    name: "Maria A.",
    message: "Hi po, how much ang red apples?",
    time: "now",
    unread: true,
  },

  {
    id: "2",
    initials: "JL",
    name: "Jun L.",
    message: "Available pa po ang mango?",
    time: "8m",
    unread: true,
  },

  {
    id: "3",
    initials: "RS",
    name: "Rica S.",
    message: "Thank you po!",
    time: "1h",
    unread: false,
  },
]

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)

  if (parts.length === 0) return "??"

  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()

  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function timeAgo(iso?: string | null): string {
  if (!iso) return "now"

  const mins = Math.max(
    0,
    Math.round((Date.now() - new Date(iso).getTime()) / 60000),
  )

  if (mins < 1) return "now"

  if (mins < 60) return `${mins}m`

  const hours = Math.floor(mins / 60)

  if (hours < 24) return `${hours}h`

  return `${Math.floor(hours / 24)}d`
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets()

  const [activeTab, setActiveTab] = useState<Tab>("today")

  const [menuOpen, setMenuOpen] = useState(false)

  const [voiceState, setVoiceState] = useState<VoiceState>("idle")

  const [voiceError, setVoiceError] = useState<string>("")

  const voiceErrorTimerRef = useRef<any>(null)

  const showVoiceError = useCallback((msg: string) => {
    setVoiceError(msg)

    if (voiceErrorTimerRef.current) clearTimeout(voiceErrorTimerRef.current)

    if (msg) {
      voiceErrorTimerRef.current = setTimeout(() => {
        setVoiceError("")
      }, 5000)
    }
  }, [])

  // In-memory PCM buffer accumulator for native Android/iOS streams so

  // encoding does not depend on broken `file:/` URIs or BlobModule fetches.

  const nativePcmRef = useRef<{ chunks: Float32Array[], sampleRate: number }>({
    chunks: [],

    sampleRate: 24000,
  })

  // 24 kHz mono 16-bit PCM WAV: exactly what the Muse Voice file endpoint accepts.

  // On web useAudioStream returns a null stream, so the mic falls back to

  // browser PCM capture (see startWebCapture).

  const { stream: voiceStream } = useAudioStream({
    sampleRate: 24000,

    channels: 1,

    encoding: "int16",

    onBuffer: (buf) => {
      if (!buf?.data || buf.data.byteLength === 0) return

      if (typeof buf.sampleRate === "number" && buf.sampleRate >= 8000) {
        nativePcmRef.current.sampleRate = buf.sampleRate
      }

      const chunk = pcmBufferToMonoFloat32(buf.data, buf.channels || 1, "int16")

      if (chunk.length > 0) {
        nativePcmRef.current.chunks.push(chunk)
      }
    },
  })

  const micOnPlayer = useAudioPlayer(require("../assets/sounds/mic-on.wav"))

  const micOffPlayer = useAudioPlayer(require("../assets/sounds/mic-off.wav"))

  const webRecRef = useRef<WebCapture | null>(null)

  const voiceRecordStartedAt = useRef(0)

  const [userName, setUserName] = useState<string>("Jefferson")

  const [isLoggedIn, setIsLoggedIn] = useState(true)

  const [pages, setPages] = useState<LinkedPage[]>([])

  const [loading, setLoading] = useState(true)

  const [refreshing, setRefreshing] = useState(false)

  const [unreadCount, setUnreadCount] = useState(2)

  const [sentToast, setSentToast] = useState(false)
  const [sentToastText, setSentToastText] = useState("Reply sent to Maria A.")


  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)

  const [activeConversationId, setActiveConversationId] =
    useState<string | null>(null)

  // Inbox tab thread view — viewing + manual reply stays inside the inbox tab

  const [selectedInbox, setSelectedInbox] = useState<{
    id: string

    name: string

    initials: string

    time: string

    psid?: string
  } | null>(null)

  const [inboxThread, setInboxThread] = useState<ChatMessage[]>([])

  const [inboxReply, setInboxReply] = useState("")

  const [sendingInboxReply, setSendingInboxReply] = useState(false)

  const [inboxSendError, setInboxSendError] = useState("")

  const selectedInboxIdRef = useRef<string | null>(null)

  const graphThreadMessagesByPsidRef = useRef<Record<string, ChatMessage[]>>({})

  // Real synced Facebook conversations — prepended above DUMMY_CONVOS, never replacing them

  const [realInboxConvos, setRealInboxConvos] = useState<{
    id: string
    name: string
    initials: string
    time: string
    message: string
    unread: boolean
    psid: string
  }[]>([])

  const UUID_RE = useMemo(
    () => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,

    [],
  )

  const [chatInput, setChatInput] = useState("")

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-1",

      sender: "mume",

      text: "Hi Jefferson! I'm Mume, your store assistant. You can write any message to me here or tap mic to talk.",

      time: "Just now",
    },
  ])

  const [isAiThinking, setIsAiThinking] = useState(false)

  const [isInputFocused, setIsInputFocused] = useState(false)

  const [isTyping, setIsTyping] = useState(false)

  const typingTimeoutRef = useRef<any>(null)

  const chatScrollRef = useRef<any>(null)

  const mainScrollRef = useRef<any>(null)

  const chatInputRef = useRef<any>(null)

  const chatCardY = useRef<number>(0)

  const actionCardY = useRef<number>(0)

  // Blue highlight triggers when user is actively typing or dictating

  const isChattingOrTyping = isTyping || voiceState === "listening"

  const scrollToActionCard = useCallback((animated = true) => {
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTo({
        y: Math.max(0, actionCardY.current - 12),

        animated,
      })
    }
  }, [])

  const scrollToConversation = useCallback((animated = true) => {
    if (mainScrollRef.current && chatCardY.current > 0) {
      mainScrollRef.current.scrollTo({
        y: Math.max(0, chatCardY.current - 16),

        animated,
      })
    }

    if (chatScrollRef.current) {
      chatScrollRef.current.scrollToEnd({ animated })
    }
  }, [])

  const handleTyping = (text: string) => {
    setChatInput(text)

    if (text.length > 0) {
      setIsTyping(true)

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }

      // Blue highlight vanishes after user pauses/stops typing

      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false)
      }, 1000)

      // Keep conversation in view and following while typing

      scrollToConversation(true)
    } else {
      setIsTyping(false)

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      chatScrollRef.current?.scrollToEnd({ animated: true })
    }, 100)

    return () => clearTimeout(timer)
  }, [chatMessages, isAiThinking])

  // Pending action state (synced with backend pending_actions when available, with Figma Make fallback)

  const [activePendingAction, setActivePendingAction] = useState<{
    id: string

    conversationId: string

    psid?: string

    customerName: string

    customerInitials: string

    customerMessage: string

    draftReply: string

    time: string
  } | null>(null)

  const [isEditingDraft, setIsEditingDraft] = useState(false)

  const [draftReply, setDraftReply] = useState(
    "Hi! Our red apples are $2.50 / kg. Fresh delivery today.",
  )

  const [isApproved, setIsApproved] = useState(false)

  const [showApprovedCard, setShowApprovedCard] = useState(false)

  // Safety net: the dock unmounts on catalog/settings tabs and in draft-edit

  // mode, which can strand focus state. Reset it (and the keyboard) there so

  // the pending card always comes back.

  useEffect(() => {
    if (activeTab === "catalog" || activeTab === "settings" || isEditingDraft) {
      if (isInputFocused) {
        setIsInputFocused(false)

        Keyboard.dismiss()
      }
    }
  }, [activeTab, isEditingDraft, isInputFocused])

  // Pro Subscription Upgrade modal state

  const [subscriptionModalOpen, setSubscriptionModalOpen] = useState(false)

  const [isProUser, setIsProUser] = useState(false)

  const [proToast, setProToast] = useState(false)

  const proAutoCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  )

  const closeSubscriptionModal = useCallback(() => {
    if (proAutoCloseTimerRef.current) {
      clearTimeout(proAutoCloseTimerRef.current)

      proAutoCloseTimerRef.current = null
    }

    setSubscriptionModalOpen(false)
  }, [])

  // Manual page link state (Settings tab)

  const [fbPageId, setFbPageId] = useState("1447275391796820")

  const [pageName, setPageName] = useState("Mume Fresh - Fruit Store")

  const [pageAccessToken, setPageAccessToken] = useState("")

  const [submittingLink, setSubmittingLink] = useState(false)

  const [linkMessage, setLinkMessage] = useState("")

  // Opening splash screen animation (5s) using mume-black.svg and mume-white.svg

  const [showSplash, setShowSplash] = useState(true)

  const splashAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    // Dismiss native splash screen so the animated SVG logo transition takes over cleanly

    SplashScreen.hideAsync().catch(() => {})

    Animated.timing(splashAnim, {
      toValue: 1,

      duration: 5000,

      useNativeDriver: false,

      easing: Easing.bezier(0.4, 0, 0.2, 1),
    }).start(() => {
      setShowSplash(false)

      // Auto-show Pro upgrade modal on the home screen for 3 seconds right after splash

      setSubscriptionModalOpen(true)

      proAutoCloseTimerRef.current = setTimeout(() => {
        setSubscriptionModalOpen(false)

        proAutoCloseTimerRef.current = null
      }, 3000)
    })

    return () => {
      if (proAutoCloseTimerRef.current) {
        clearTimeout(proAutoCloseTimerRef.current)
      }
    }
  }, [splashAnim])

  const splashBg = splashAnim.interpolate({
    inputRange: [0, 0.38, 0.58, 1],

    outputRange: ["#FFFFFF", "#FFFFFF", "#121317", "#121317"],
  })

  const splashBlackOpacity = splashAnim.interpolate({
    inputRange: [0, 0.18, 0.4, 0.56, 1],

    outputRange: [0, 1, 1, 0, 0],
  })

  const splashWhiteOpacity = splashAnim.interpolate({
    inputRange: [0, 0.4, 0.56, 0.78, 1],

    outputRange: [0, 0, 1, 1, 0.95],
  })

  const splashScale = splashAnim.interpolate({
    inputRange: [0, 0.35, 0.7, 1],

    outputRange: [0.9, 1, 1.04, 1.08],
  })

  const splashContainerOpacity = splashAnim.interpolate({
    inputRange: [0, 0.74, 1],

    outputRange: [1, 1, 0],
  })

  // Products / Catalog state

  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS)

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  const [productForm, setProductForm] = useState<{
    name: string

    price: string

    stock: "In stock" | "Low stock" | "Out of stock"

    imageKey: "apple" | "mango" | "banana" | "custom"

    imageUri?: string
  }>({
    name: "",

    price: "",

    stock: "In stock",

    imageKey: "apple",

    imageUri: undefined,
  })

  const handlePickCustomImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],

        allowsEditing: true,

        aspect: [1, 1],

        quality: 0.8,
      })

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri

        setProductForm((prev) => ({
          ...prev,

          imageUri: uri,

          imageKey: "custom",
        }))

        return
      }
    } catch (err) {
      console.warn(
        "ImagePicker launch failed, falling back to web file input:",
        err,
      )

      if (typeof document !== "undefined") {
        const input = document.createElement("input")

        input.type = "file"

        input.accept = "image/*"

        input.style.position = "fixed"

        input.style.top = "-1000px"

        input.style.left = "-1000px"

        input.style.opacity = "0"

        document.body.appendChild(input)

        input.onchange = (e: any) => {
          const file = e.target?.files?.[0]

          if (file) {
            const reader = new FileReader()

            reader.onload = (event) => {
              const res = event.target?.result as string

              if (res) {
                setProductForm((prev) => ({
                  ...prev,

                  imageUri: res,

                  imageKey: "custom",
                }))
              }
            }

            reader.readAsDataURL(file)
          }

          try {
            document.body.removeChild(input)
          } catch {}
        }

        input.click()
      }
    }
  }

  const handleOpenEditProduct = (prod: Product) => {
    setSelectedProduct(prod)

    setProductForm({
      name: prod.name,

      price: prod.price,

      stock: prod.stock,

      imageKey: prod.imageKey || "apple",

      imageUri: prod.imageUri,
    })
  }

  const handleSaveProductEdit = () => {
    if (!selectedProduct) return

    const trimmedName = productForm.name.trim()

    if (!trimmedName) return

    setProducts((prev) =>
      prev.map((item) =>
        item.id === selectedProduct.id
          ? {
              ...item,

              name: trimmedName,

              price: productForm.price.trim() || "$0 / kg",

              stock: productForm.stock,

              isStock: productForm.stock === "In stock",

              imageKey: productForm.imageKey,

              imageUri:
                productForm.imageKey === "custom"
                  ? productForm.imageUri
                  : undefined,
            }
          : item,
      ),
    )

    setSelectedProduct(null)
  }

  const handleDeleteProduct = () => {
    if (!selectedProduct) return

    setProducts((prev) => prev.filter((item) => item.id !== selectedProduct.id))

    setSelectedProduct(null)
  }

  const handleOpenCreateProduct = () => {
    setProductForm({
      name: "",

      price: "$",

      stock: "In stock",

      imageKey: "apple",

      imageUri: undefined,
    })

    setIsCreateModalOpen(true)
  }

  const handleSaveCreateProduct = () => {
    const trimmedName = productForm.name.trim()

    if (!trimmedName) return

    const newProd: Product = {
      id: `prod-${Date.now()}`,

      name: trimmedName,

      price: productForm.price.trim() || "$0 / kg",

      stock: productForm.stock,

      isStock: productForm.stock === "In stock",

      imageKey: productForm.imageKey,

      imageUri:
        productForm.imageKey === "custom" ? productForm.imageUri : undefined,
    }

    setProducts((prev) => [...prev, newProd])

    setIsCreateModalOpen(false)
  }

  // Dynamically compute user initials from real user name

  const userInitials = useMemo(() => {
    if (!isLoggedIn) return "?"

    const parts = userName.trim().split(/\s+/).filter(Boolean)

    if (parts.length === 0) return "JS"

    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()

    return (parts[0][0] + parts[1][0]).toUpperCase()
  }, [isLoggedIn, userName])

  const loadLinkedPages = useCallback(async () => {
    try {
      const data = await api.getLinkedPages()

      setPages(data)
    } catch (err) {
      console.warn("Failed to load linked pages:", err)
    } finally {
      setLoading(false)

      setRefreshing(false)
    }
  }, [])

  // Sync real customer conversations for the connected Facebook page.

  // Source: Supabase conversations/messages rows written by the backend

  // webhook worker on every Facebook Page event. Result is PREPENDED above

  // DUMMY_CONVOS — dummies are never removed. Silent fallback to dummies-only.

  const loadRealInbox = useCallback(async () => {
    const pageId = pages[0]?.id

    if (!isLoggedIn || !pageId) {
      setRealInboxConvos([])

      return []
    }

    try {
      let convs: any[] = []

      try {
        convs = await api.getPageConversations(pageId)
      } catch {
        const { data } = await supabase

          .from("conversations")

          .select("id, customer_psid, customer_name, last_message_at")

          .eq("page_id", pageId)

          .neq("customer_psid", "mume_assistant")

          .order("last_message_at", { ascending: false })

        convs = data || []
      }

      if (!convs.length) {
        setRealInboxConvos([])

        return []
      }

      const ids = convs.map((c: any) => c.id)

      const latestByConv: Record<string, any> = {}

      for (const c of convs) {
        if (c.latest_message) {
          latestByConv[c.id] = c.latest_message
        }
      }

      const missingPreviewIds = ids.filter((id: string) => !latestByConv[id])

      if (missingPreviewIds.length > 0) {
        try {
          const { data: msgs } = await supabase

            .from("messages")

            .select("conversation_id, text, created_at, is_from_customer")

            .in("conversation_id", missingPreviewIds)

            .order("created_at", { ascending: false })

          for (const m of msgs || []) {
            if (!latestByConv[m.conversation_id])
              latestByConv[m.conversation_id] = m
          }
        } catch (msgErr) {
          console.warn("Real inbox previews unavailable:", msgErr)
        }
      }

      const stillMissing = ids.filter((id: string) => !latestByConv[id])

      if (stillMissing.length > 0) {
        try {
          const inboxData = await api.getPageInbox(pageId, 10)

          const graphThreads = inboxData?.conversations || []

          const fbPageIdStr = String(pages[0]?.fb_page_id || "")

          for (const gt of graphThreads) {
            const senders = gt.senders?.data || []

            const customer =
              senders.find((s: any) => String(s.id) !== fbPageIdStr) ||
              senders[0]

            if (!customer?.id) continue

            const matchConv = convs.find(
              (c: any) => String(c.customer_psid) === String(customer.id),
            )

            if (!matchConv) continue

            const threadMsgs = await api.getPageThreadMessages(
              pageId,
              gt.id,
              20,
            )

            if (threadMsgs && threadMsgs.length > 0) {
              const latestGm = threadMsgs[0]

              latestByConv[matchConv.id] = {
                text: latestGm.message,

                created_at: latestGm.created_time,

                is_from_customer:
                  String(latestGm.from?.id) === String(customer.id),
              }

              graphThreadMessagesByPsidRef.current[String(customer.id)] =
                threadMsgs

                  .slice()

                  .reverse()

                  .filter((gm: any) => gm.message)

                  .map((gm: any) => ({
                    id: gm.id,

                    sender: (String(gm.from?.id) === String(customer.id)
                      ? "mume"
                      : "user") as "mume" | "user",

                    text: gm.message,

                    time: new Date(gm.created_time).toLocaleTimeString([], {
                      hour: "2-digit",

                      minute: "2-digit",
                    }),
                  }))
            }
          }
        } catch (graphFallbackErr) {
          console.warn("Graph inbox fallback skipped:", graphFallbackErr)
        }
      }

      const mappedConvos = convs.map((c: any) => {
        const name = c.customer_name || "Customer"

        const latest = latestByConv[c.id]

        return {
          id: c.id,

          name,

          initials: initialsOf(name),

          message: latest?.text || c.last_message_text || "New conversation",

          time: timeAgo(latest?.created_at || c.last_message_at),

          unread:
            typeof c.unread === "boolean"
              ? c.unread
              : !!latest?.is_from_customer,

          psid: c.customer_psid,
        }
      })

      setRealInboxConvos(mappedConvos)

      // Sync real pending actions for the Home approval card

      try {
        const actions = await api.getPendingActions(pageId)

        if (actions && actions.length > 0) {
          const top = actions[0]

          const matchConv =
            convs.find((c: any) => c.id === top.conversation_id) || convs[0]

          const custName =
            top.customer_name || matchConv?.customer_name || "Customer"

          const custMsg =
            top.customer_message ||
            latestByConv[top.conversation_id]?.text ||
            (matchConv ? latestByConv[matchConv.id]?.text : null) ||
            "Customer inquiry on Messenger"

          setActivePendingAction({
            id: top.id,

            conversationId: top.conversation_id,

            psid: top.customer_psid,

            customerName: custName,

            customerInitials: initialsOf(custName),

            customerMessage: custMsg,

            draftReply: top.draft_reply,

            time: timeAgo(top.created_at),
          })

          setDraftReply((prev) => (isEditingDraft ? prev : top.draft_reply))

          setIsApproved(false)
        }
      } catch (actErr) {
        console.warn("Pending actions sync skipped:", actErr)
      }

      return mappedConvos
    } catch (err) {
      console.warn("Real inbox sync failed, showing demo conversations:", err)

      setRealInboxConvos([])

      return []
    }
  }, [pages, isLoggedIn, isEditingDraft])

  useEffect(() => {
    loadLinkedPages()

    let isMounted = true

    async function loadChat() {
      try {
        const chatData = await api.getChatMessages()

        if (isMounted && chatData?.messages && chatData.messages.length > 0) {
          setActiveConversationId(chatData.conversationId)

          setChatMessages(chatData.messages)

          return
        }
      } catch (err) {
        console.warn(
          "Backend chat API offline, checking Supabase directly:",
          err,
        )
      }

      try {
        const { data: conv } = await supabase

          .from("conversations")

          .select("id")

          .eq("customer_psid", "mume_assistant")

          .maybeSingle()

        if (conv && isMounted) {
          setActiveConversationId(conv.id)

          const { data: msgs } = await supabase

            .from("messages")

            .select("id, sender, text, created_at")

            .eq("conversation_id", conv.id)

            .order("created_at", { ascending: true })

          if (msgs && msgs.length > 0 && isMounted) {
            setChatMessages(
              msgs.map((m) => ({
                id: m.id,

                sender: m.sender === "mume" ? "mume" : "user",

                text: m.text,

                time: new Date(m.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
              })),
            )
          }
        }
      } catch (sbErr) {
        console.warn("Supabase direct query failed:", sbErr)
      }
    }

    loadChat()

    // Listen for incoming messages AND new/updated conversations in real-time,

    // so the inbox list and open threads update automatically

    const channel = supabase

      .channel("realtime_inbox")

      .on(
        "postgres_changes",

        { event: "*", schema: "public", table: "conversations" },

        () => {
          loadRealInbox()
        },
      )

      .on(
        "postgres_changes",

        { event: "INSERT", schema: "public", table: "messages" },

        (payload) => {
          const newMsg = payload.new as any

          if (!newMsg) return

          // If it's a customer message, increment unread count

          if (newMsg.is_from_customer) {
            setUnreadCount((prev) => prev + 1)
          }

          // Append to chat stream if not already present

          setChatMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev

            return [
              ...prev,

              {
                id: newMsg.id,

                sender: newMsg.sender === "mume" ? "mume" : "user",

                text: newMsg.text,

                time: new Date(newMsg.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
              },
            ]
          })

          // Append to the open inbox thread when the message belongs to it

          if (
            selectedInboxIdRef.current &&
            newMsg.conversation_id === selectedInboxIdRef.current
          ) {
            setInboxThread((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev

              const incoming = {
                id: newMsg.id,

                sender: (newMsg.is_from_customer
                  ? "mume"
                  : "user") as "mume" | "user",

                text: newMsg.text,

                time: new Date(newMsg.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
              }

              // Drop any optimistic temp bubble the server row now supersedes

              const withoutTempDup = prev.filter(
                (m) =>
                  !(
                    m.id.startsWith("me-") &&
                    m.sender === incoming.sender &&
                    m.text === incoming.text
                  ),
              )

              return [...withoutTempDup, incoming]
            })
          }

          setTimeout(() => scrollToConversation(true), 50)
        },
      )

      .subscribe()

    return () => {
      isMounted = false

      supabase.removeChannel(channel)
    }
  }, [loadLinkedPages, loadRealInbox, scrollToConversation])

  // Re-sync real Facebook conversations when linked pages arrive,

  // and every time the merchant opens the inbox tab

  useEffect(() => {
    loadRealInbox()
  }, [loadRealInbox])

  useEffect(() => {
    if (activeTab === "inbox") loadRealInbox()
  }, [activeTab, loadRealInbox])

  const onRefresh = () => {
    setRefreshing(true)

    loadLinkedPages()

    loadRealInbox()
  }

  // Never leave speech or timers running after the screen unmounts.

  useEffect(() => {
    return () => {
      Speech.stop()

      if (voiceErrorTimerRef.current) clearTimeout(voiceErrorTimerRef.current)
    }
  }, [])

  // Best-effort mic earcons: a failed beep must never break recording.

  const playEarcon = (player: {
    seekTo: (seconds: number) => void
    play: () => void
  }) => {
    try {
      player.seekTo(0)

      player.play()
    } catch {
      // Earcon is best-effort only.
    }
  }

  // Mic toggle: tap to start recording, tap again to stop, transcribe

  // via Muse Voice, and send the transcript to Mume as a chat message.

  // Records 24 kHz mono 16-bit PCM WAV: the exact format the file endpoint takes.

  const handleVoice = async () => {
    if (voiceState === "thinking") return

    // On web useAudioStream returns a null stream, so the mic falls back

    // to browser PCM capture (see startWebCapture).

    const onWeb = Platform.OS === "web"

    if (voiceState === "idle") {
      showVoiceError("")

      try {
        if (onWeb) {
          playEarcon(micOnPlayer)

          webRecRef.current = await startWebCapture()

          voiceRecordStartedAt.current = Date.now()

          setVoiceState("listening")

          return
        }

        if (!voiceStream) {
          throw new Error("Voice recording is not supported on this device")
        }

        const { granted } = await requestRecordingPermissionsAsync()

        if (!granted) {
          showVoiceError(
            "Microphone permission denied — enable it in Settings.",
          )

          return
        }

        Speech.stop()

        playEarcon(micOnPlayer)

        nativePcmRef.current = { chunks: [], sampleRate: 24000 }

        await setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
        })

        await voiceStream.start()

        try {
          await voiceStream.startFileRecordingAsync()
        } catch {
          // Live onBuffer PCM capture is primary; file recording is fallback only.
        }

        voiceRecordStartedAt.current = Date.now()

        setVoiceState("listening")
      } catch (err: any) {
        const msg = err?.message || "Could not start microphone"

        console.warn("Voice record start failed:", msg)

        showVoiceError(msg)
      }

      return
    }

    const elapsedMs = Date.now() - voiceRecordStartedAt.current

    try {
      setVoiceState("thinking")

      let base64 = ""
      let voiceAudioUri: string | undefined

      let browserTranscript = ""

      if (onWeb) {
        playEarcon(micOffPlayer)

        const cap = webRecRef.current

        webRecRef.current = null

        if (elapsedMs < 1000) {
          if (cap) await stopWebCapture(cap)

          const secs = (elapsedMs / 1000).toFixed(1)

          throw new Error(
            `That tap was too short (${secs}s) — tap mic, speak, then tap again.`,
          )
        }

        if (!cap || cap.chunks.length === 0)
          throw new Error("No recording captured")

        ;({ base64, browserTranscript } = await stopWebCapture(cap))
        voiceAudioUri = `data:audio/wav;base64,${base64}`

        const approxBytes = Math.floor((base64.length * 3) / 4)

        if (approxBytes < 4096 && !browserTranscript) {
          throw new Error(
            `Mic captured only ${approxBytes} bytes — check microphone access and try again.`,
          )
        }
      } else {
        if (!voiceStream) {
          throw new Error("Voice recording is not supported on this device")
        }

        // Allow any in-flight native buffer event on mainQueue to land before stopping.

        await new Promise((r) => setTimeout(r, 60))

        let file: any = null

        try {
          file = await voiceStream.stopFileRecordingAsync()
        } catch {
          // File writer may not have been active; live chunks are primary.
        }

        try {
          voiceStream.stop()
        } catch {
          // Stream already stopped.
        }

        // Restore playback session on iOS/Android so earcons & TTS work after recording.

        try {
          await setAudioModeAsync({
            allowsRecording: false,
            playsInSilentMode: true,
          })
        } catch {
          // Best-effort session restore.
        }

        playEarcon(micOffPlayer)

        const liveChunks = nativePcmRef.current.chunks

        const liveSampleRate =
          nativePcmRef.current.sampleRate || file?.sampleRate || 24000

        nativePcmRef.current = { chunks: [], sampleRate: 24000 }

        let totalLiveSamples = 0

        for (const c of liveChunks) totalLiveSamples += c.length

        if (elapsedMs < 1000 && totalLiveSamples < liveSampleRate) {
          const secs = (elapsedMs / 1000).toFixed(1)

          throw new Error(
            `That tap was too short (${secs}s) — tap mic, speak, then tap again.`,
          )
        }

        if (totalLiveSamples > 0) {
          base64 = encodeWavBase64(liveChunks, liveSampleRate, 24000)

          const approxBytes = Math.floor((base64.length * 3) / 4)

          if (approxBytes < 4096) {
            throw new Error(
              `Mic captured only ${approxBytes} bytes — check microphone access and try again.`,
            )
          }
        } else {
          if (!file?.uri) throw new Error("No recording captured")

          if (file.duration < 1) {
            throw new Error(
              `That tap was too short (${file.duration.toFixed(1)}s) — tap mic, speak, then tap again.`,
            )
          }

          if (file.size < 4096) {
            throw new Error(
              `Mic captured only ${file.size} bytes in ${file.duration.toFixed(1)}s — check microphone access and try again.`,
            )
          }

          ;({ base64 } = await uriToBase64(file.uri))
          voiceAudioUri = file.uri

          const recorded = wavToMonoFloat32(decodeBase64ToBytes(base64))

          base64 = encodeWavBase64([recorded.pcm], recorded.sampleRate, 24000)
        }
      }

      let transcribedText = ""

      try {
        const { text } = await api.transcribeVoice({ audio: base64 })

        transcribedText = (text || "").trim()
      } catch (apiErr: any) {
        if (browserTranscript.trim()) {
          transcribedText = browserTranscript.trim()
        } else {
          throw apiErr
        }
      }

      if (!transcribedText && browserTranscript.trim()) {
        transcribedText = browserTranscript.trim()
      }

      if (!transcribedText) throw new Error("Couldn't hear that — try again.")

      const backupParsed = parseSendToCustomer(transcribedText)

      if (backupParsed && !backupParsed.body && !backupParsed.targetName) {
        setChatInput(transcribedText)

        showVoiceError("What should I send? Say e.g. send hello to Maria.")

        return
      }

      const customerText = extractSendToCustomerText(transcribedText)
      if (customerText && selectedInbox) {
        setActiveTab("inbox")
        await deliverToOpenThread(customerText, voiceAudioUri)
        return
      }
      if (customerText && !selectedInbox) {
        setChatInput(transcribedText)
        showVoiceError(
          "Open a customer conversation in Message first, then record again — draft kept above.",
        )
        return
      }
      if (await routeCapsuleText(transcribedText, voiceAudioUri)) return

      await handleSendMessage(transcribedText)
    } catch (err: any) {
      const msg = err?.message || "Voice transcription failed"

      console.warn("Voice transcribe failed:", msg)

      showVoiceError(msg)

      if (!onWeb) {
        try {
          voiceStream?.stop()
        } catch {
          // Stream already stopped.
        }

        try {
          await setAudioModeAsync({
            allowsRecording: false,
            playsInSilentMode: true,
          })
        } catch {
          // Best-effort session restore.
        }
      }
    } finally {
      setVoiceState("idle")
    }
  }

  const handleSendMessage = async (sendText?: string) => {
    const trimmed = (sendText ?? chatInput).trim()

    if (!trimmed || isAiThinking) return

    // Send-to-customer commands route live to the thread, never to AI.

    if (await routeCapsuleText(trimmed)) return

    // Sending restores the normal layout: blur fires onBlur, which brings

    // the pending card back and re-locks the outer scroll.

    chatInputRef.current?.blur()

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    setIsTyping(false)

    const tempUserId = `user-${Date.now()}`

    const userMsg: ChatMessage = {
      id: tempUserId,

      sender: "user",

      text: trimmed,

      time: "Just now",
    }

    setChatMessages((prev) => [...prev, userMsg])

    setChatInput("")

    setIsAiThinking(true)

    setTimeout(() => scrollToConversation(true), 50)

    let openedThread = false

    try {
      // 1. Send via Backend API

      const res = await api.sendChatMessage(trimmed, pages[0]?.id)

      if (res?.aiMessage) {
        setChatMessages((prev) => {
          const withoutTemp = prev.filter((m) => m.id !== tempUserId)

          return [
            ...withoutTemp,

            {
              id: res.userMessage.id,

              sender: "user",

              text: res.userMessage.text,

              time: "Just now",
            },

            {
              id: res.aiMessage.id,

              sender: "mume",

              text: res.aiMessage.text,

              time: "Just now",
            },
          ]
        })
      }

      if (res?.sentTo && res.sentTo.length > 0) {
        openedThread = true

        await openSentThread(res.sentTo[0].conversationId)
      }
    } catch {
      // 2. Direct Supabase persistence fallback

      const replyText = getMumeAiReply(trimmed)

      try {
        let convId = activeConversationId

        if (!convId) {
          const { data: firstPage } = await supabase
            .from("pages")
            .select("id")
            .limit(1)
            .maybeSingle()

          if (firstPage) {
            const { data: conv } = await supabase

              .from("conversations")

              .upsert(
                {
                  page_id: firstPage.id,

                  customer_psid: "mume_assistant",

                  customer_name: "Mume AI Assistant",

                  last_message_at: new Date().toISOString(),
                },

                { onConflict: "page_id,customer_psid" },
              )

              .select("id")

              .single()

            convId = conv?.id || null

            if (convId) setActiveConversationId(convId)
          }
        }

        if (convId) {
          const { data: uMsg } = await supabase

            .from("messages")

            .insert({
              conversation_id: convId,

              sender: "user",

              text: trimmed,

              is_from_customer: false,
            })

            .select()

            .single()

          const { data: aMsg } = await supabase

            .from("messages")

            .insert({
              conversation_id: convId,

              sender: "mume",

              text: replyText,

              is_from_customer: false,
            })

            .select()

            .single()

          if (uMsg && aMsg) {
            setChatMessages((prev) => {
              const withoutTemp = prev.filter((m) => m.id !== tempUserId)

              return [
                ...withoutTemp,

                {
                  id: uMsg.id,
                  sender: "user",
                  text: uMsg.text,
                  time: "Just now",
                },

                {
                  id: aMsg.id,
                  sender: "mume",
                  text: aMsg.text,
                  time: "Just now",
                },
              ]
            })

            return
          }
        }
      } catch (persistErr) {
        console.warn("Direct Supabase persistence warning:", persistErr)
      }

      // 3. In-memory fallback

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,

        sender: "mume",

        text: replyText,

        time: "Just now",
      }

      setChatMessages((prev) => [...prev, aiMsg])
    } finally {
      setIsAiThinking(false)

      if (!openedThread) loadRealInbox()

      setTimeout(() => scrollToConversation(true), 50)
    }
  }

  const handleApprove = async () => {
    setIsEditingDraft(false)

    if (!activePendingAction?.id) {
      setIsApproved(true)

      setShowApprovedCard(true)

      setSentToastText("Reply sent to Maria A.")

      setSentToast(true)

      setTimeout(() => {
        setShowApprovedCard(false)
      }, 2000)

      setTimeout(() => {
        setSentToast(false)
      }, 3500)

      return
    }

    try {
      const result: any = await api.approvePendingAction(
        activePendingAction.id,
        draftReply,
      )

      const delivered = !!(
        result &&
        result.status === "sent" &&
        result.graphResult &&
        result.graphResult.message_id
      )

      if (!delivered) {
        const reason =
          result?.warning ||
          result?.error ||
          "Messenger dispatch did not confirm delivery."

        setSentToastText(`Approved \u2014 NOT delivered: ${reason}`)

        setSentToast(true)

        setTimeout(() => {
          setSentToast(false)
        }, 5000)

        return
      }

      const sentConversationId = activePendingAction.conversationId

      setIsApproved(true)

      setShowApprovedCard(true)

      setSentToastText(`Reply sent to ${activePendingAction.customerName}.`)

      setSentToast(true)

      setActivePendingAction(null)

      if (sentConversationId) {
        await openSentThread(sentConversationId)
      } else {
        loadRealInbox()
      }
    } catch (err) {
      console.warn("Pending action backend approval warning:", err)

      const reason =
        err instanceof Error ? err.message : "Approve request failed."

      setSentToastText(`Approve failed \u2014 NOT sent: ${reason}`)

      setSentToast(true)

      setTimeout(() => {
        setSentToast(false)
      }, 5000)

      return
    }

    setTimeout(() => {
      setShowApprovedCard(false)
    }, 2000)

    setTimeout(() => {
      setSentToast(false)
    }, 3500)
  }

  // Open a customer thread inside the inbox tab (never leaves the tab)

  const openInboxThread = async (convo: {
    id: string

    name: string

    initials: string

    time: string

    message: string

    psid?: string
  }) => {
    const { message, psid, ...header } = convo

    setSelectedInbox(psid ? { ...header, psid } : header)

    selectedInboxIdRef.current = convo.id

    setRealInboxConvos((prev) =>
      prev.map((c) => (c.id === convo.id ? { ...c, unread: false } : c)),
    )

    setInboxReply("")

    setInboxSendError("")

    // Seed with the listed message instantly so the thread never looks empty

    setInboxThread([
      { id: `c-${convo.id}`, sender: "mume", text: message, time: convo.time },
    ])

    // Real conversation row: load persisted history via backend service_role first, then Supabase fallback

    if (UUID_RE.test(convo.id)) {
      try {
        let rows: any[] = []

        try {
          rows = await api.getConversationMessages(convo.id)
        } catch {
          const { data } = await supabase

            .from("messages")

            .select("id, sender, text, created_at, is_from_customer")

            .eq("conversation_id", convo.id)

            .order("created_at", { ascending: true })

          rows = data || []
        }

        if (rows && rows.length > 0) {
          setInboxThread(
            rows.map((m: any) => ({
              id: m.id,

              sender:
                m.is_from_customer || m.sender === "customer" ? "mume" : "user",

              text: m.text,

              time: new Date(m.created_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
            })),
          )
        } else if (
          convo.psid &&
          graphThreadMessagesByPsidRef.current[convo.psid]?.length
        ) {
          setInboxThread(graphThreadMessagesByPsidRef.current[convo.psid])
        }
      } catch (err) {
        console.warn(
          "Inbox thread history failed, showing listed message:",
          err,
        )
      }
    }
  }

  const closeInboxThread = () => {
    setSelectedInbox(null)

    selectedInboxIdRef.current = null

    setInboxThread([])

    setInboxReply("")

    setInboxSendError("")
  }

  // After any successful send, jump to the customer thread so the

  // delivered message is visible (the thread reloads history live).

  const openSentThread = async (conversationId?: string | null) => {
    if (!conversationId) return

    const convos = (await loadRealInbox()) || []

    const match = convos.find((c: any) => c.id === conversationId)

    if (!match) return

    setActiveTab("inbox")

    await openInboxThread(match)
  }

  // Manual merchant reply — runs entirely inside the inbox tab.

  // Tier 1: backend dispatch (persists + sends via Graph API).

  // Tier 2: direct Supabase insert for real conversation rows.

  // Tier 3: in-memory append for demo mocks (same convention as home chat).

  // Delivers text (+ optional recorded voice note) to the open customer thread.

  const deliverToOpenThread = async (
    rawText: string,
    audioUri?: string,
    convoOverride?: { id: string; psid?: string } | null,
  ) => {
    const trimmed = rawText.trim()

    const inbox = convoOverride || selectedInbox

    if (!trimmed || !inbox || sendingInboxReply) return false

    setSendingInboxReply(true)

    setInboxSendError("")

    const tempId = `me-${Date.now()}`

    setInboxThread((prev) => [
      ...prev,

      {
        id: tempId,
        sender: "user",
        text: trimmed,
        time: "Just now",
        ...(audioUri ? { audioUri } : {}),
      },
    ])

    setInboxReply("")

    try {
      const pageId = pages[0]?.id

      const psid = inbox?.psid

      if (pageId && psid) {
        // Tier 1: real dispatch — typing Send IS the human approval

        const sent = await api.replyToCustomer(pageId, {
          psid,

          text: trimmed,

          lastCustomerMessageAt: new Date().toISOString(),
        })

        // Refresh from the persisted conversation so the optimistic

        // bubble is replaced by the real row (avoids Realtime duplicates)

        if (sent?.conversationId && !audioUri) {
          selectedInboxIdRef.current = sent.conversationId

          setSelectedInbox((prev) =>
            prev ? { ...prev, id: sent.conversationId } : prev,
          )

          try {
            let rows: any[] = []

            try {
              rows = await api.getConversationMessages(sent.conversationId)
            } catch {
              const { data } = await supabase

                .from("messages")

                .select("id, sender, text, created_at, is_from_customer")

                .eq("conversation_id", sent.conversationId)

                .order("created_at", { ascending: true })

              rows = data || []
            }

            if (rows && rows.length > 0) {
              setInboxThread(
                rows.map((m: any) => ({
                  id: m.id,

                  sender:
                    m.is_from_customer || m.sender === "customer"
                      ? "mume"
                      : "user",

                  text: m.text,

                  time: new Date(m.created_at).toLocaleTimeString([], {
                    hour: "2-digit",

                    minute: "2-digit",
                  }),
                })),
              )

              return
            }
          } catch (refreshErr) {
            console.warn(
              "Inbox thread refresh failed, keeping optimistic message:",
              refreshErr,
            )
          }
        }

        return true
      }

      if (UUID_RE.test(inbox.id)) {
        // Tier 2: persist merchant reply for real conversation rows

        const { data, error } = await supabase

          .from("messages")

          .insert({
            conversation_id: inbox.id,

            sender: "page",

            text: trimmed,

            is_from_customer: false,
          })

          .select("id, text, created_at")

          .single()

        if (error) throw error

        if (data) {
          setInboxThread((prev) =>
            prev.map((m) =>
              m.id === tempId
                ? {
                    ...m,

                    id: data.id,

                    time: new Date(data.created_at).toLocaleTimeString([], {
                      hour: "2-digit",

                      minute: "2-digit",
                    }),
                  }
                : m,
            ),
          )

          return true
        }

        throw new Error("Reply was not saved")
      }

      // Tier 3: demo mocks have no backend row — temp message stays in memory
      return true

    } catch (err: any) {
      // Remote send attempted and failed: drop the optimistic bubble, log only

      setInboxThread((prev) => prev.filter((m) => m.id !== tempId))

      setInboxReply(trimmed)

      console.warn("Inbox reply failed (kept as draft):", err?.message || err)
      return false

    } finally {
      setSendingInboxReply(false)
    }
  }

  // "Send <message> to <name>" (typed or spoken) routes live to the
  // matching customer thread — real convo first, demo thread after —
  // through the same Tier 1/2/3 delivery pipeline as manual replies.
  const routeCapsuleText = async (
    raw: string,
    audioUri?: string,
  ): Promise<boolean> => {
    const parsed = parseSendToCustomer(raw)

    if (!parsed) return false

    if (!parsed.body) {
      setChatInput(raw)

      showVoiceError(
        parsed.targetName
          ? `What should I send to ${parsed.targetName}?`
          : "Say e.g. send hello to Maria.",
      )

      return true
    }

    const pool = [...realInboxConvos, ...DUMMY_CONVOS]

    if (!parsed.targetName) {
      if (!selectedInbox) {
        setChatInput(raw)

        showVoiceError("Open a customer conversation first.")

        return true
      }

      const ok = await deliverToOpenThread(parsed.body, audioUri, {
        id: selectedInbox.id,
        psid: selectedInbox.psid,
      })

      if (!ok) showVoiceError("Message NOT sent — kept as draft in the thread.")

      return true
    }

    const match = findConvoByName(pool, parsed.targetName)

    if (!match) {
      setChatInput(raw)

      showVoiceError("No customer thread matches " + parsed.targetName + ".")

      return true
    }

    setActiveTab("inbox")

    await openInboxThread(match)

    const ok = await deliverToOpenThread(parsed.body, audioUri, match)

    if (ok) {
      setSentToastText(`Sent to ${match.name}.`)

      setSentToast(true)

      setTimeout(() => {
        setSentToast(false)
      }, 3500)
    } else {
      showVoiceError("Message NOT sent — kept as draft in the thread.")
    }

    return true
  }

  const handleSendInboxReply = async () => {
    await deliverToOpenThread(inboxReply)
  }

  const handleOAuthLogin = async () => {
    try {
      setSubmittingLink(true)

      const url = await api.getFacebookLoginUrl()

      const supported = await Linking.canOpenURL(url)

      if (supported) {
        await Linking.openURL(url)
      }
    } catch (err: any) {
      setLinkMessage(err.message || "OAuth error")
    } finally {
      setIsLoggedIn(true)

      setUserName("Jefferson")

      setUnreadCount(2)

      setIsApproved(false)

      setShowApprovedCard(false)

      setSubmittingLink(false)

      setMenuOpen(false)

      loadLinkedPages()
    }
  }

  const handleLogout = () => {
    setIsLoggedIn(false)

    setUserName("")

    setPages([])

    setUnreadCount(0)

    setIsApproved(false)

    setShowApprovedCard(false)

    setMenuOpen(false)
  }

  const handleLogin = async () => {
    await handleOAuthLogin()
  }

  const handleDirectLink = async () => {
    if (!fbPageId.trim() || !pageName.trim() || !pageAccessToken.trim()) {
      setLinkMessage("Please enter Page ID, Name, and Page Token.")

      return
    }

    try {
      setSubmittingLink(true)

      const page = await api.linkDirectPage({
        fbPageId: fbPageId.trim(),

        pageName: pageName.trim(),

        pageAccessToken: pageAccessToken.trim(),
      })

      setLinkMessage(`Page "${page.page_name}" linked successfully!`)

      await loadLinkedPages()
    } catch (err: any) {
      setLinkMessage(err.message || "Direct link failed")
    } finally {
      setSubmittingLink(false)
    }
  }

  const linkedPage = pages[0]

  const activePageTitle = isLoggedIn
    ? linkedPage?.page_name || "Mume Fresh - Fruit Store"
    : "No Store Linked"

  return (
    <View style={styles.rootContainer}>
      <StatusBar style="light" />
      {/* Opening Splash Animation (5s) using mume-black and mume-white */}
      {showSplash && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.splashOverlay,

            {
              backgroundColor: splashBg,

              opacity: splashContainerOpacity,
            },
          ]}
        >
          <Animated.View
            style={[
              styles.splashLogoContainer,

              { transform: [{ scale: splashScale }] },
            ]}
          >
            <Animated.View
              style={[
                styles.splashLogoAbsolute,
                { opacity: splashBlackOpacity },
              ]}
            >
              <MumeLogo width={140} height={46} color="#000000" />
            </Animated.View>
            <Animated.View
              style={[
                styles.splashLogoAbsolute,
                { opacity: splashWhiteOpacity },
              ]}
            >
              <MumeLogo width={140} height={46} color="#FFFFFF" />
            </Animated.View>
          </Animated.View>
        </Animated.View>
      )}

      {/* 1. Black Top App Bar */}
      <SafeAreaView edges={["top"]} style={styles.headerSafeArea}>
        <View style={styles.headerRow} accessibilityRole="header">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Main menu"
            onPress={() => {
              Keyboard.dismiss()

              setMenuOpen(true)
            }}
            style={styles.menuIconButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <AppIcon name="menu" size={20} color="#FFFFFF" />
          </Pressable>

          <View style={styles.headerLogoContainer}>
            <MumeLogo width={80} height={30} color="#FFFFFF" />
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Subscription upgrade"
            onPress={() => {
              Keyboard.dismiss()

              if (proAutoCloseTimerRef.current) {
                clearTimeout(proAutoCloseTimerRef.current)

                proAutoCloseTimerRef.current = null
              }

              setSubscriptionModalOpen(true)
            }}
            style={[styles.profileBadge, isProUser && styles.profileBadgePro]}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <AppIcon
              name="subscription-upgrade"
              size={20}
              color={isProUser ? "#FACC15" : "#FFFFFF"}
              strokeWidth={2}
            />
          </Pressable>
        </View>
      </SafeAreaView>

      {/* 2. Main Body Content */}
      <SafeAreaView
        edges={["left", "right", "bottom"]}
        style={styles.bodySafeArea}
      >
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingContainer}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          enabled={Platform.OS !== "web"}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            ref={mainScrollRef}
            style={styles.mainScrollView}
            bounces={false}
            keyboardShouldPersistTaps="handled"
            overScrollMode="never"
            scrollEnabled={
              activeTab !== "today" || isEditingDraft || isInputFocused
            }
            showsVerticalScrollIndicator={activeTab !== "today"}
            contentContainerStyle={[
              styles.scrollContent,

              activeTab === "today" &&
                !isEditingDraft &&
                styles.scrollContentToday,

              isApproved && !showApprovedCard && styles.scrollContentExpanded,

              activeTab === "catalog" && styles.scrollContentCatalog,

              isEditingDraft && styles.scrollContentEditingDraft,
            ]}
            refreshControl={
              activeTab !== "today" ? (
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={THEME.colors.primary}
                />
              ) : undefined
            }
          >
            {activeTab === "today" && (
              <View
                style={[
                  styles.screenContainer,
                  isApproved &&
                    !showApprovedCard &&
                    styles.screenContainerExpanded,
                ]}
              >
                {/* Zero-State Hero Section with Message Chip on the Right Side */}
                <View style={styles.geminiZeroStateContainer}>
                  <View style={styles.geminiHeroCopy}>
                    <Text style={styles.geminiHeroTitle}>
                      {isLoggedIn
                        ? `Hello, ${userName.trim().split(/\s+/)[0] || userName}`
                        : "Welcome to Mume"}
                    </Text>
                    <Text style={styles.geminiHeroSubtitle}>
                      {isLoggedIn
                        ? "Welcome to Mume!"
                        : "Connect your Facebook Page to start managing inquiries."}
                    </Text>
                  </View>

                  {isLoggedIn ? (
                    <Pressable
                      style={styles.geminiChip}
                      onPress={() => setActiveTab("inbox")}
                    >
                      <AppIcon
                        name="message-circle"
                        size={14}
                        color={THEME.colors.primary}
                      />
                      <Text
                        style={styles.geminiChipText}
                      >{`Message (${unreadCount})`}</Text>
                    </Pressable>
                  ) : (
                    <Pressable style={styles.geminiChip} onPress={handleLogin}>
                      <AppIcon
                        name="baseline-facebook"
                        size={14}
                        color="#1877F2"
                      />
                      <Text style={styles.geminiChipText}>
                        Login using Facebook
                      </Text>
                    </Pressable>
                  )}
                </View>

                {isLoggedIn ? (
                  <>
                    {/* Section Heading & Action / Feedback Card */}
                    {/* While typing on mobile, the pending card steps aside so the chat card slides up over its spot above the keyboard. Restored on blur. */}
                    {!isApproved &&
                    !(isInputFocused && Platform.OS !== "web") ? (
                      <>
                        <View style={styles.sectionHeaderRow}>
                          <Text style={styles.sectionHeading}>
                            Ready for you
                          </Text>
                        </View>

                        {/* Pending Action Card */}
                        <View
                          onLayout={(e) => {
                            actionCardY.current = e.nativeEvent.layout.y
                          }}
                          style={[
                            styles.approvalCard,
                            isEditingDraft && styles.approvalCardEditing,
                          ]}
                        >
                          <View style={styles.customerRow}>
                            <View style={styles.avatar}>
                              <Text style={styles.avatarText}>
                                {activePendingAction?.customerInitials || "MA"}
                              </Text>
                            </View>
                            <View style={styles.customerInfoCol}>
                              <Text style={styles.customerName}>
                                {activePendingAction?.customerName ||
                                  "Maria A."}
                              </Text>
                              <Text style={styles.customerContext}>
                                Messenger · Price inquiry
                              </Text>
                            </View>
                            <Text style={styles.timeLabel}>
                              {activePendingAction?.time || "now"}
                            </Text>
                          </View>

                          <View style={styles.messageBubble}>
                            <Text style={styles.messageBubbleText}>
                              {`“${activePendingAction?.customerMessage || "Hi, how much are the red apples?"}”`}
                            </Text>
                          </View>

                          {/* Draft Block: Full text editable */}
                          <View
                            style={[
                              styles.draftBlock,
                              isEditingDraft && styles.draftBlockEditing,
                            ]}
                          >
                            <View style={styles.draftLabelRow}>
                              <View style={styles.draftLabelLeft}>
                                <AppIcon
                                  name="bot"
                                  size={16}
                                  color={THEME.colors.primary}
                                />
                                <Text style={styles.draftLabelText}>
                                  Mume’s suggested reply
                                </Text>
                              </View>
                            </View>

                            {isEditingDraft ? (
                              <View style={styles.draftEditorWrapper}>
                                <Text style={styles.draftEditorHint}>
                                  Edit message to send to customer:
                                </Text>
                                <TextInput
                                  autoFocus
                                  multiline
                                  numberOfLines={3}
                                  style={styles.draftTextInput}
                                  value={draftReply}
                                  onChangeText={setDraftReply}
                                  placeholder="Type message to customer…"
                                  placeholderTextColor={THEME.colors.textMuted}
                                  onFocus={() => {
                                    scrollToActionCard(true)
                                  }}
                                />
                              </View>
                            ) : (
                              <Pressable
                                style={styles.draftTextContainer}
                                onPress={() => {
                                  setIsEditingDraft(true)

                                  setTimeout(() => scrollToActionCard(true), 60)
                                }}
                                accessibilityRole="button"
                                accessibilityLabel="Tap to edit full message text"
                              >
                                <Text style={styles.draftText}>
                                  {draftReply}
                                </Text>
                                <Text style={styles.tapToEditHint}>
                                  Tap to edit full message
                                </Text>
                              </Pressable>
                            )}
                          </View>

                          <View style={styles.approvalActions}>
                            <Pressable
                              accessibilityRole="button"
                              style={[
                                styles.secondaryButton,
                                isEditingDraft && styles.secondaryButtonActive,
                              ]}
                              onPress={() => {
                                setIsEditingDraft((v) => {
                                  const next = !v

                                  if (next) {
                                    setTimeout(
                                      () => scrollToActionCard(true),
                                      60,
                                    )
                                  }

                                  return next
                                })
                              }}
                            >
                              <View style={styles.buttonInnerRow}>
                                <AppIcon
                                  name={isEditingDraft ? "check" : "edit"}
                                  size={15}
                                  color={THEME.colors.text}
                                />
                                <Text style={styles.secondaryButtonText}>
                                  {isEditingDraft
                                    ? "Done editing"
                                    : "Edit message"}
                                </Text>
                              </View>
                            </Pressable>

                            <Pressable
                              accessibilityRole="button"
                              style={styles.primaryButton}
                              onPress={() => {
                                setIsEditingDraft(false)

                                handleApprove()
                              }}
                            >
                              <View style={styles.buttonInnerRow}>
                                <Text style={styles.primaryButtonText}>
                                  Approve & send
                                </Text>
                                <AppIcon
                                  name="check"
                                  size={16}
                                  color="#FFFFFF"
                                  strokeWidth={2.5}
                                />
                              </View>
                            </Pressable>
                          </View>
                        </View>
                      </>
                    ) : showApprovedCard ? (
                      <>
                        <View style={styles.sectionHeaderRow}>
                          <Text style={styles.sectionHeading}>
                            Ready for you
                          </Text>
                          <View
                            style={[
                              styles.sectionBadgePill,
                              styles.sectionBadgeApproved,
                            ]}
                          >
                            <Text
                              style={[
                                styles.sectionBadgeText,
                                styles.sectionBadgeTextApproved,
                              ]}
                            >
                              0 actions
                            </Text>
                          </View>
                        </View>

                        <View style={styles.emptyCard}>
                          <View style={styles.emptyCheckBadge}>
                            <AppIcon
                              name="check"
                              size={28}
                              color={THEME.colors.speaking}
                              strokeWidth={2.5}
                            />
                          </View>
                          <Text style={styles.emptyCardTitle}>
                            All Caught Up!
                          </Text>
                          <Text style={styles.emptyCardSubtitle}>
                            Reply confirmed and dispatched to Maria via Meta
                            Graph API.
                          </Text>
                        </View>
                      </>
                    ) : null}

                    {/* Mume AI Chat Stream (Positioned below Pending Action Card) */}
                    {chatMessages.length > 0 && (
                      <View
                        onLayout={(e) => {
                          chatCardY.current = e.nativeEvent.layout.y
                        }}
                        style={[
                          styles.chatSectionCard,

                          isApproved &&
                            !showApprovedCard &&
                            styles.chatSectionCardExpanded,
                        ]}
                      >
                        <View style={styles.chatSectionHeader}>
                          <View style={styles.chatHeaderLeft}>
                            <View
                              style={[
                                styles.chatHeaderBadge,
                                isChattingOrTyping &&
                                  styles.chatHeaderBadgeActive,
                              ]}
                            >
                              <AppIcon name="bot" size={16} color="#FFFFFF" />
                            </View>
                            <Text style={styles.chatHeaderTitle}>
                              Mume AI Chat
                            </Text>
                          </View>
                          {isChattingOrTyping ? (
                            <View style={styles.activeHighlightBadge}>
                              <View style={styles.activeHighlightDot} />
                              <Text style={styles.activeHighlightText}>
                                {voiceState === "listening"
                                  ? "Listening"
                                  : "Typing…"}
                              </Text>
                            </View>
                          ) : (
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel="Collapse chat card"
                              accessibilityHint="Returns the chat card to its original size"
                              onPress={() => {
                                setShowApprovedCard(false)

                                setIsApproved(false)
                              }}
                              style={styles.chatCollapseBtn}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              <AppIcon
                                name="chevron-down"
                                size={20}
                                color={THEME.colors.textMuted}
                                strokeWidth={2.2}
                              />
                            </Pressable>
                          )}
                        </View>

                        <ScrollView
                          ref={chatScrollRef}
                          style={[
                            styles.chatScrollView,

                            Platform.OS === "web"
                              ? {
                                  scrollbarWidth: "none",

                                  msOverflowStyle: "none",

                                  overscrollBehavior: "contain",
                                } as any
                              : null,
                          ]}
                          contentContainerStyle={styles.chatMessagesList}
                          nestedScrollEnabled={true}
                          keyboardShouldPersistTaps="handled"
                          showsVerticalScrollIndicator={false}
                          bounces={true}
                          overScrollMode="always"
                          onContentSizeChange={() => {
                            chatScrollRef.current?.scrollToEnd({
                              animated: false,
                            })
                          }}
                          scrollEventThrottle={16}
                        >
                          <View style={styles.chatMessagesSpacer} />
                          {chatMessages.map((msg) => (
                            <View
                              key={msg.id}
                              style={[
                                styles.chatBubbleRow,

                                msg.sender === "user"
                                  ? styles.chatBubbleRowUser
                                  : styles.chatBubbleRowAi,
                              ]}
                            >
                              {msg.sender === "mume" && (
                                <View style={styles.chatAvatarAi}>
                                  <AppIcon
                                    name="bot"
                                    size={15}
                                    color="#FFFFFF"
                                  />
                                </View>
                              )}
                              <View
                                style={[
                                  styles.chatBubble,

                                  msg.sender === "user"
                                    ? styles.chatBubbleUser
                                    : styles.chatBubbleAi,
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.chatBubbleText,

                                    msg.sender === "user"
                                      ? styles.chatBubbleTextUser
                                      : styles.chatBubbleTextAi,
                                  ]}
                                >
                                  {msg.text}
                                </Text>
                                <Text
                                  style={[
                                    styles.chatBubbleTime,

                                    msg.sender === "user"
                                      ? styles.chatBubbleTimeUser
                                      : styles.chatBubbleTimeAi,
                                  ]}
                                >
                                  {msg.time}
                                </Text>
                              </View>
                            </View>
                          ))}

                          {isAiThinking && (
                            <View
                              style={[
                                styles.chatBubbleRow,
                                styles.chatBubbleRowAi,
                              ]}
                            >
                              <View style={styles.chatAvatarAi}>
                                <AppIcon name="bot" size={15} color="#FFFFFF" />
                              </View>
                              <View
                                style={[
                                  styles.chatBubble,
                                  styles.chatBubbleAi,
                                  styles.chatThinkingBubble,
                                ]}
                              >
                                <ActivityIndicator
                                  size="small"
                                  color={THEME.colors.primary}
                                />
                                <Text style={styles.chatThinkingText}>
                                  Mume is thinking…
                                </Text>
                              </View>
                            </View>
                          )}
                        </ScrollView>
                      </View>
                    )}
                  </>
                ) : (
                  <View style={styles.emptyStateCard}>
                    <View style={styles.emptyStateIconCircle}>
                      <AppIcon
                        name="log-in"
                        size={30}
                        color={THEME.colors.primary}
                        strokeWidth={2}
                      />
                    </View>
                    <Text style={styles.emptyStateTitle}>
                      No Active Store Connected
                    </Text>
                    <Text style={styles.emptyStateSubtitle}>
                      You are currently logged out. Connect your Facebook
                      account to view customer messages, approve drafts, and
                      manage store catalog.
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Login using Facebook"
                      style={styles.fbLoginPrimaryBtn}
                      onPress={handleLogin}
                    >
                      <AppIcon
                        name="baseline-facebook"
                        size={18}
                        color="#FFFFFF"
                      />
                      <Text style={styles.fbLoginPrimaryBtnText}>
                        Login using Facebook
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>
            )}

            {activeTab === "inbox" && (
              <View style={styles.screenContainer}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionHeading}>Message</Text>
                  <Text style={styles.sectionBadge}>
                    {isLoggedIn
                      ? `${[...realInboxConvos, ...DUMMY_CONVOS].filter((c) => c.unread).length} unread`
                      : "0 unread"}
                  </Text>
                </View>

                {isLoggedIn ? (
                  selectedInbox ? (
                    <View style={styles.inboxThreadContainer}>
                      <View style={styles.inboxThreadHeader}>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Back to messages"
                          onPress={closeInboxThread}
                          style={styles.inboxBackBtn}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <AppIcon
                            name="chevron-left"
                            size={22}
                            color={THEME.colors.text}
                            strokeWidth={2.2}
                          />
                        </Pressable>
                        <View style={styles.conversationAvatar}>
                          <Text style={styles.conversationAvatarText}>
                            {selectedInbox.initials}
                          </Text>
                        </View>
                        <View style={styles.conversationCopy}>
                          <Text style={styles.conversationName}>
                            {selectedInbox.name}
                          </Text>
                          <Text
                            style={styles.conversationMessage}
                            numberOfLines={1}
                          >
                            Messenger · Customer
                          </Text>
                        </View>
                      </View>

                      <ScrollView
                        style={styles.inboxThreadScroll}
                        contentContainerStyle={styles.inboxThreadContent}
                        nestedScrollEnabled={true}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                      >
                        {inboxThread.map((msg) => (
                          <View
                            key={msg.id}
                            style={[
                              styles.chatBubbleRow,

                              msg.sender === "user"
                                ? styles.chatBubbleRowUser
                                : styles.chatBubbleRowAi,
                            ]}
                          >
                            {msg.sender !== "user" && (
                              <View style={styles.conversationAvatar}>
                                <Text style={styles.conversationAvatarText}>
                                  {selectedInbox.initials}
                                </Text>
                              </View>
                            )}
                            <View
                              style={[
                                styles.chatBubble,

                                msg.sender === "user"
                                  ? styles.chatBubbleUser
                                  : styles.chatBubbleAi,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.chatBubbleText,

                                  msg.sender === "user"
                                    ? styles.chatBubbleTextUser
                                    : styles.chatBubbleTextAi,
                                ]}
                                selectable
                              >
                                {msg.text}
                              </Text>
                              {msg.sender === "user" && msg.audioUri ? (
                                <VoiceNotePlayer uri={msg.audioUri} />
                              ) : null}
                              <Text
                                style={[
                                  styles.chatBubbleTime,

                                  msg.sender === "user"
                                    ? styles.chatBubbleTimeUser
                                    : styles.chatBubbleTimeAi,
                                ]}
                              >
                                {msg.time}
                              </Text>
                            </View>
                          </View>
                        ))}
                      </ScrollView>

                      <View style={styles.inboxReplyRow}>
                        <TextInput
                          style={styles.inboxReplyInput}
                          placeholder={`Reply to ${selectedInbox.name}…`}
                          placeholderTextColor={THEME.colors.textMuted}
                          value={inboxReply}
                          onChangeText={setInboxReply}
                          multiline
                          maxLength={1000}
                          returnKeyType="send"
                          onSubmitEditing={handleSendInboxReply}
                          blurOnSubmit={false}
                          editable={!sendingInboxReply}
                        />
                        <View style={styles.inboxReplyToolbar}>
                          <Text style={styles.inboxReplyHint}>
                            Manual reply · sends live
                          </Text>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Send reply to ${selectedInbox.name}`}
                            onPress={handleSendInboxReply}
                            disabled={!inboxReply.trim() || sendingInboxReply}
                            style={[
                              styles.inboxSendBtn,

                              !!inboxReply.trim() &&
                                styles.inboxSendBtnActive,
                            ]}
                          >
                            {sendingInboxReply ? (
                              <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                              <AppIcon
                                name="send"
                                size={15}
                                color={
                                  inboxReply.trim()
                                    ? "#FFFFFF"
                                    : THEME.colors.textMuted
                                }
                                strokeWidth={2.2}
                              />
                            )}
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  ) : (
                    [...realInboxConvos, ...DUMMY_CONVOS].map((convo) => (
                      <Pressable
                        key={convo.id}
                        style={styles.conversationCard}
                        accessibilityRole="button"
                        accessibilityLabel={`Open conversation with ${convo.name}`}
                        onPress={() => openInboxThread(convo)}
                      >
                        <View style={styles.conversationAvatar}>
                          <Text style={styles.conversationAvatarText}>
                            {convo.initials}
                          </Text>
                        </View>
                        <View style={styles.conversationCopy}>
                          <Text style={styles.conversationName}>
                            {convo.name}
                          </Text>
                          <Text
                            style={styles.conversationMessage}
                            numberOfLines={1}
                          >
                            {convo.message}
                          </Text>
                        </View>
                        <View style={styles.conversationMeta}>
                          <Text style={styles.conversationTime}>
                            {convo.time}
                          </Text>
                          {convo.unread && <View style={styles.unreadDot} />}
                        </View>
                      </Pressable>
                    ))
                  )
                ) : (
                  <View style={styles.emptyStateCard}>
                    <View style={styles.emptyStateIconCircle}>
                      <AppIcon
                        name="message-circle"
                        size={30}
                        color={THEME.colors.textMuted}
                        strokeWidth={1.8}
                      />
                    </View>
                    <Text style={styles.emptyStateTitle}>No Conversations</Text>
                    <Text style={styles.emptyStateSubtitle}>
                      No customer messages to show. Log in using your Facebook
                      account to synchronize inquiries.
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Login using Facebook"
                      style={styles.fbLoginPrimaryBtn}
                      onPress={handleLogin}
                    >
                      <AppIcon
                        name="baseline-facebook"
                        size={18}
                        color="#FFFFFF"
                      />
                      <Text style={styles.fbLoginPrimaryBtnText}>
                        Login using Facebook
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>
            )}

            {activeTab === "catalog" && (
              <View style={styles.screenContainer}>
                <View style={styles.catalogHeaderRow}>
                  <View>
                    <Text style={styles.sectionHeading}>Catalog</Text>
                    <Text style={styles.sectionBadgeText}>
                      {isLoggedIn
                        ? `${products.length} products`
                        : "0 products"}
                    </Text>
                  </View>
                </View>

                {isLoggedIn ? (
                  products.length === 0 ? (
                    <View style={styles.emptyCatalogCard}>
                      <Text style={styles.emptyCatalogTitle}>
                        No products in catalog
                      </Text>
                      <Text style={styles.emptyCatalogSubtitle}>
                        Tap the "+" button below to create your first fruit
                        item.
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.catalogGrid}>
                      {products.map((item) => (
                        <Pressable
                          key={item.id}
                          accessibilityRole="button"
                          accessibilityLabel={`Edit ${item.name}`}
                          style={styles.productCard}
                          onPress={() => handleOpenEditProduct(item)}
                        >
                          <View style={styles.productImageContainer}>
                            <Image
                              source={
                                item.imageUri
                                  ? { uri: item.imageUri }
                                  : FRUIT_IMAGES[
                                      (item.imageKey as "apple" | "mango" | "banana")
                                    ] || FRUIT_IMAGES.apple
                              }
                              style={styles.productImage as any}
                              resizeMode="cover"
                            />
                            <View
                              style={[
                                styles.stockPill,

                                item.stock === "In stock"
                                  ? styles.stockIn
                                  : item.stock === "Low stock"
                                    ? styles.stockLow
                                    : styles.stockOut,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.stockPillText,

                                  item.stock === "In stock"
                                    ? styles.stockInText
                                    : item.stock === "Low stock"
                                      ? styles.stockLowText
                                      : styles.stockOutText,
                                ]}
                              >
                                {item.stock}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.productName}>{item.name}</Text>
                          <Text style={styles.productPrice}>{item.price}</Text>
                        </Pressable>
                      ))}
                    </View>
                  )
                ) : (
                  <View style={styles.emptyStateCard}>
                    <View style={styles.emptyStateIconCircle}>
                      <AppIcon
                        name="folder"
                        size={30}
                        color={THEME.colors.textMuted}
                        strokeWidth={1.8}
                      />
                    </View>
                    <Text style={styles.emptyStateTitle}>Catalog is Empty</Text>
                    <Text style={styles.emptyStateSubtitle}>
                      No products found. Log in using your Facebook account to
                      link and manage your store inventory.
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Login using Facebook"
                      style={styles.fbLoginPrimaryBtn}
                      onPress={handleLogin}
                    >
                      <AppIcon
                        name="baseline-facebook"
                        size={18}
                        color="#FFFFFF"
                      />
                      <Text style={styles.fbLoginPrimaryBtnText}>
                        Login using Facebook
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>
            )}

            {activeTab === "settings" && (
              <View style={styles.screenContainer}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionHeading}>Settings & Linking</Text>
                  <Text style={styles.sectionBadge}>v1.0.0</Text>
                </View>

                {/* Connected Facebook Page Status */}
                <View style={styles.settingsCard}>
                  <Text style={styles.settingsCardTitle}>
                    CONNECTED FACEBOOK PAGE
                  </Text>
                  {loading ? (
                    <ActivityIndicator color={THEME.colors.primary} />
                  ) : isLoggedIn && linkedPage ? (
                    <View>
                      <View style={styles.pageBadgeRow}>
                        <Text style={styles.statusDotGreen}>●</Text>
                        <Text style={styles.pageName}>
                          {linkedPage.page_name}
                        </Text>
                      </View>
                      <Text style={styles.pageDetails}>
                        Page ID: {linkedPage.fb_page_id}
                      </Text>
                    </View>
                  ) : (
                    <View>
                      <Text style={styles.cardValueMuted}>
                        No Business Page linked yet.
                      </Text>
                      <Text style={styles.cardHelp}>
                        Connect your Facebook Page to allow Mume to read
                        inquiries and draft replies.
                      </Text>
                    </View>
                  )}
                </View>

                {/* Method 1: Facebook Login OAuth */}
                <View style={styles.settingsCard}>
                  <Text style={styles.settingsCardTitle}>
                    METHOD 1: OFFICIAL FACEBOOK LOGIN
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    style={styles.fbButton}
                    onPress={handleLogin}
                    disabled={submittingLink}
                  >
                    {submittingLink ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <View style={styles.buttonInnerRow}>
                        <AppIcon
                          name="baseline-facebook"
                          size={18}
                          color="#FFFFFF"
                        />
                        <Text style={styles.fbButtonText}>
                          {isLoggedIn
                            ? "Re-authenticate with Facebook"
                            : "Login using Facebook"}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                </View>

                {/* Method 2: Direct Page Token (Dev) */}
                <View style={styles.settingsCard}>
                  <Text style={styles.settingsCardTitle}>
                    METHOD 2: DIRECT PAGE TOKEN (DEV)
                  </Text>
                  <Text style={styles.inputLabel}>Page ID</Text>
                  <TextInput
                    style={styles.input}
                    value={fbPageId}
                    onChangeText={setFbPageId}
                    placeholder="2165823377350527"
                    placeholderTextColor={THEME.colors.textMuted}
                  />
                  <Text style={styles.inputLabel}>Page Name</Text>
                  <TextInput
                    style={styles.input}
                    value={pageName}
                    onChangeText={setPageName}
                    placeholder="Mume Fresh - Fruit Store"
                    placeholderTextColor={THEME.colors.textMuted}
                  />
                  <Text style={styles.inputLabel}>Page Access Token</Text>
                  <TextInput
                    style={[styles.input, styles.tokenInput]}
                    value={pageAccessToken}
                    onChangeText={setPageAccessToken}
                    placeholder="Paste EAAG... token"
                    placeholderTextColor={THEME.colors.textMuted}
                    secureTextEntry
                    multiline
                  />
                  <Pressable
                    accessibilityRole="button"
                    style={[styles.primaryButton, styles.linkDirectButton]}
                    onPress={handleDirectLink}
                    disabled={submittingLink}
                  >
                    {submittingLink ? (
                      <ActivityIndicator color={THEME.colors.textInverted} />
                    ) : (
                      <Text style={styles.primaryButtonText}>
                        Link Page Directly
                      </Text>
                    )}
                  </Pressable>

                  {linkMessage ? (
                    <Text style={styles.linkMessageText}>{linkMessage}</Text>
                  ) : null}
                </View>
              </View>
            )}
          </ScrollView>

          {/* 3. Gemini-Style Floating Bottom Input Capsule Dock (Size x 2 with Multi-Line Text Input) */}
          {activeTab !== "catalog" &&
            activeTab !== "settings" &&
            activeTab !== "inbox" &&
            !isEditingDraft && (
              <View
                style={styles.geminiInputDockContainer}
                pointerEvents="box-none"
              >
                <View style={styles.geminiInputCapsule}>
                  {/* Top Row: Merchant can write a message to talk to AI */}
                  <View style={styles.capsuleTextInputWrapper}>
                    <TextInput
                      ref={chatInputRef}
                      style={styles.capsuleTextInput}
                      placeholder="Ask Mume or write a message…"
                      placeholderTextColor={THEME.colors.textMuted}
                      value={chatInput}
                      onChangeText={handleTyping}
                      onFocus={() => {
                        setIsInputFocused(true)

                        scrollToConversation(true)

                        // Re-scroll once the keyboard frame has settled so the

                        // latest messages stay visible above the resized viewport.

                        setTimeout(() => scrollToConversation(true), 300)
                      }}
                      onBlur={() => {
                        setIsInputFocused(false)

                        if (typingTimeoutRef.current) {
                          clearTimeout(typingTimeoutRef.current)
                        }

                        setIsTyping(false)
                      }}
                      multiline
                      maxLength={400}
                      returnKeyType="send"
                      onSubmitEditing={() => handleSendMessage()}
                      blurOnSubmit={false}
                    />
                  </View>

                  {/* Bottom Row: Actions & Dictate controls */}
                  <View style={styles.capsuleControlsRow}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Quick tools & catalog"
                      onPress={() => setActiveTab("catalog")}
                      style={styles.geminiPlusButton}
                    >
                      <AppIcon
                        name="plus"
                        size={18}
                        color={THEME.colors.text}
                        strokeWidth={2.2}
                      />
                    </Pressable>

                    {/* Voice state indicator / subtle status */}
                    <View style={styles.capsuleStatusArea}>
                      {voiceState === "listening" && (
                        <View style={styles.voiceStateRow}>
                          <VoiceWave />
                          <Text style={styles.voiceStateListeningText}>
                            Listening…
                          </Text>
                        </View>
                      )}
                      {voiceState === "thinking" && (
                        <View style={styles.voiceStateRow}>
                          <AppIcon
                            name="bot"
                            size={15}
                            color={THEME.colors.primary}
                          />
                          <Text style={styles.voiceStateThinkingText}>
                            Checking your page…
                          </Text>
                        </View>
                      )}
                      {voiceState === "idle" && !!voiceError && (
                        <Text
                          style={styles.capsuleErrorText}
                          numberOfLines={1}
                          selectable
                        >
                          {voiceError}
                        </Text>
                      )}
                      {voiceState === "idle" && !voiceError && !chatInput && (
                        <Text style={styles.capsuleHintText}>
                          Tap mic or write to AI
                        </Text>
                      )}
                    </View>

                    <View style={styles.capsuleActionsRight}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Dictate and talk to Mume"
                        onPress={handleVoice}
                        style={[
                          styles.geminiMicSmallButton,

                          voiceState === "listening" &&
                            styles.geminiMicSmallButtonActive,
                        ]}
                      >
                        <AppIcon
                          name={
                            voiceState === "thinking"
                              ? "bot"
                              : voiceState === "listening"
                                ? "mic-audio-lines"
                                : "mic"
                          }
                          size={18}
                          color={
                            voiceState === "listening"
                              ? "#FFFFFF"
                              : THEME.colors.text
                          }
                          strokeWidth={2}
                        />
                      </Pressable>

                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Send message to AI"
                        onPress={() => handleSendMessage()}
                        disabled={!chatInput.trim() || isAiThinking}
                        style={[
                          styles.geminiSendButton,

                          chatInput.trim().length > 0 &&
                            styles.geminiSendButtonActive,
                        ]}
                      >
                        <AppIcon
                          name="send"
                          size={15}
                          color={
                            chatInput.trim().length > 0
                              ? "#FFFFFF"
                              : THEME.colors.textMuted
                          }
                          strokeWidth={2.2}
                        />
                      </Pressable>
                    </View>
                  </View>
                </View>

                <Text style={styles.capabilitiesDisclaimer}>
                  Nothing is sent to customers without your approval.
                </Text>
              </View>
            )}

          {/* Floating Add Product Button at Bottom for Catalog */}
          {activeTab === "catalog" && isLoggedIn && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add"
              style={styles.addProductFab}
              onPress={handleOpenCreateProduct}
            >
              <AppIcon name="round-plus" size={24} color="#FFFFFF" />
            </Pressable>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* 4. Slide-Out Side Navigation Drawer (Responsive Full-Height Modal) */}
      <Modal
        visible={menuOpen}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setMenuOpen(false)}
        statusBarTranslucent={true}
      >
        <View style={styles.drawerModalOverlay}>
          <Pressable
            style={styles.drawerBackdrop}
            accessibilityRole="button"
            accessibilityLabel="Close navigation menu"
            onPress={() => setMenuOpen(false)}
          />
          <View
            style={[
              styles.drawerPanel,

              {
                paddingTop: Math.max(insets.top, 16),

                paddingBottom: Math.max(insets.bottom, 16),
              },
            ]}
          >
            <ScrollView
              contentContainerStyle={styles.drawerScrollContent}
              showsVerticalScrollIndicator={false}
              bounces={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.drawerTopSection}>
                {/* Drawer Header */}
                <View style={styles.drawerHeader}>
                  <View style={styles.drawerBrandRow}>
                    <MumeLogo
                      width={80}
                      height={30}
                      color={THEME.colors.obsidian}
                    />
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Close menu"
                    onPress={() => setMenuOpen(false)}
                    style={styles.drawerCloseButton}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <AppIcon name="x" size={20} color={THEME.colors.text} />
                  </Pressable>
                </View>

                {/* Store Card in Drawer */}
                <View style={styles.drawerStoreCard}>
                  <Text style={styles.drawerStoreName} numberOfLines={1}>
                    {activePageTitle}
                  </Text>
                  <Text style={styles.drawerStoreMeta}>
                    {isLoggedIn
                      ? "Messenger AI Assistant · Meta Synced"
                      : "Log in with Facebook to sync store"}
                  </Text>
                </View>

                {/* Navigation Options List */}
                <View style={styles.drawerNavSection}>
                  <Text style={styles.drawerSectionLabel}>NAVIGATION</Text>

                  {/* 1. Home */}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Home Tab"
                    style={[
                      styles.drawerNavItem,

                      activeTab === "today" && styles.drawerNavItemActive,
                    ]}
                    onPress={() => {
                      setActiveTab("today")

                      setMenuOpen(false)
                    }}
                  >
                    <View
                      style={[
                        styles.drawerNavIconWrap,

                        activeTab === "today" && styles.drawerNavIconWrapActive,
                      ]}
                    >
                      <AppIcon
                        name="home"
                        size={20}
                        color={
                          activeTab === "today"
                            ? THEME.colors.primary
                            : THEME.colors.text
                        }
                        strokeWidth={activeTab === "today" ? 2.3 : 1.8}
                      />
                    </View>
                    <View style={styles.drawerNavCopy}>
                      <Text
                        style={[
                          styles.drawerNavTitle,

                          activeTab === "today" && styles.drawerNavTitleActive,
                        ]}
                      >
                        Home
                      </Text>
                      <Text style={styles.drawerNavSubtitle}>
                        Overview & action items
                      </Text>
                    </View>
                    {activeTab === "today" && (
                      <View style={styles.drawerActiveIndicator} />
                    )}
                  </Pressable>

                  {/* 2. Message */}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Message Tab"
                    style={[
                      styles.drawerNavItem,

                      activeTab === "inbox" && styles.drawerNavItemActive,
                    ]}
                    onPress={() => {
                      setActiveTab("inbox")

                      setMenuOpen(false)
                    }}
                  >
                    <View
                      style={[
                        styles.drawerNavIconWrap,

                        activeTab === "inbox" && styles.drawerNavIconWrapActive,
                      ]}
                    >
                      <AppIcon
                        name="message-circle"
                        size={20}
                        color={
                          activeTab === "inbox"
                            ? THEME.colors.primary
                            : THEME.colors.text
                        }
                        strokeWidth={activeTab === "inbox" ? 2.3 : 1.8}
                      />
                    </View>
                    <View style={styles.drawerNavCopy}>
                      <Text
                        style={[
                          styles.drawerNavTitle,

                          activeTab === "inbox" && styles.drawerNavTitleActive,
                        ]}
                      >
                        Message
                      </Text>
                      <Text style={styles.drawerNavSubtitle}>
                        Customer inquiries
                      </Text>
                    </View>
                    <View style={styles.drawerBadge}>
                      <Text style={styles.drawerBadgeText}>
                        {isLoggedIn ? unreadCount : 0}
                      </Text>
                    </View>
                  </Pressable>

                  {/* 3. Catalog */}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Catalog Tab"
                    style={[
                      styles.drawerNavItem,

                      activeTab === "catalog" && styles.drawerNavItemActive,
                    ]}
                    onPress={() => {
                      setActiveTab("catalog")

                      setMenuOpen(false)
                    }}
                  >
                    <View
                      style={[
                        styles.drawerNavIconWrap,

                        activeTab === "catalog" &&
                          styles.drawerNavIconWrapActive,
                      ]}
                    >
                      <AppIcon
                        name="folder"
                        size={20}
                        color={
                          activeTab === "catalog"
                            ? THEME.colors.primary
                            : THEME.colors.text
                        }
                        strokeWidth={activeTab === "catalog" ? 2.3 : 1.8}
                      />
                    </View>
                    <View style={styles.drawerNavCopy}>
                      <Text
                        style={[
                          styles.drawerNavTitle,

                          activeTab === "catalog" &&
                            styles.drawerNavTitleActive,
                        ]}
                      >
                        Catalog
                      </Text>
                      <Text style={styles.drawerNavSubtitle}>
                        Products & prices
                      </Text>
                    </View>
                    <View style={styles.drawerBadgeSecondary}>
                      <Text style={styles.drawerBadgeTextSecondary}>
                        {isLoggedIn ? products.length : 0}
                      </Text>
                    </View>
                  </Pressable>

                  {/* 4. Settings */}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Settings Tab"
                    style={[
                      styles.drawerNavItem,

                      activeTab === "settings" && styles.drawerNavItemActive,
                    ]}
                    onPress={() => {
                      setActiveTab("settings")

                      setMenuOpen(false)
                    }}
                  >
                    <View
                      style={[
                        styles.drawerNavIconWrap,

                        activeTab === "settings" &&
                          styles.drawerNavIconWrapActive,
                      ]}
                    >
                      <AppIcon
                        name="wrench"
                        size={20}
                        color={
                          activeTab === "settings"
                            ? THEME.colors.primary
                            : THEME.colors.text
                        }
                        strokeWidth={activeTab === "settings" ? 2.3 : 1.8}
                      />
                    </View>
                    <View style={styles.drawerNavCopy}>
                      <Text
                        style={[
                          styles.drawerNavTitle,

                          activeTab === "settings" &&
                            styles.drawerNavTitleActive,
                        ]}
                      >
                        Settings
                      </Text>
                      <Text style={styles.drawerNavSubtitle}>
                        Meta token & OAuth
                      </Text>
                    </View>
                    {activeTab === "settings" && (
                      <View style={styles.drawerActiveIndicator} />
                    )}
                  </Pressable>
                </View>
              </View>

              {/* Drawer Footer User Profile or Login */}
              {isLoggedIn ? (
                <View style={styles.drawerUserFooter}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="User profile and settings"
                    style={styles.drawerUserClickArea}
                    onPress={() => {
                      setActiveTab("settings")

                      setMenuOpen(false)
                    }}
                  >
                    <View style={styles.drawerUserAvatar}>
                      <Text style={styles.drawerUserAvatarText}>
                        {userInitials}
                      </Text>
                    </View>
                    <View style={styles.drawerUserCopy}>
                      <Text style={styles.drawerUserName}>{userName}</Text>
                      <Text style={styles.drawerUserRole}>
                        Store Owner · Admin
                      </Text>
                    </View>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Log out"
                    style={styles.drawerLogoutBtn}
                    onPress={() => setLogoutConfirmOpen(true)}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <AppIcon
                      name="log-out"
                      size={18}
                      color="#676A72"
                      strokeWidth={2}
                    />
                  </Pressable>
                </View>
              ) : (
                <View style={styles.drawerUserFooter}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Login using Facebook"
                    style={styles.drawerLoginBtn}
                    onPress={handleLogin}
                  >
                    <AppIcon
                      name="baseline-facebook"
                      size={18}
                      color="#FFFFFF"
                    />
                    <Text style={styles.drawerLoginBtnText}>
                      Login using Facebook
                    </Text>
                  </Pressable>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 5. Logout Confirmation Dialog Modal */}
      <Modal
        visible={logoutConfirmOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setLogoutConfirmOpen(false)}
      >
        <Pressable
          style={styles.confirmModalOverlay}
          onPress={() => setLogoutConfirmOpen(false)}
        >
          <View
            style={styles.confirmModalCard}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.confirmModalIconCircle}>
              <AppIcon
                name="log-out"
                size={24}
                color="#676A72"
                strokeWidth={2}
              />
            </View>
            <Text style={styles.confirmModalTitle}>Log Out of Mume?</Text>
            <Text style={styles.confirmModalSubtitle}>
              Are you sure you want to log out? You will need to reconnect to
              manage your store inquiries.
            </Text>
            <View style={styles.confirmModalActionsRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancel"
                style={styles.confirmModalCancelBtn}
                onPress={() => setLogoutConfirmOpen(false)}
              >
                <Text style={styles.confirmModalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Confirm Log Out"
                style={styles.confirmModalLogoutBtn}
                onPress={() => {
                  setLogoutConfirmOpen(false)

                  handleLogout()
                }}
              >
                <Text style={styles.confirmModalLogoutText}>Log Out</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* 6. Edit Product Modal */}
      <Modal
        visible={!!selectedProduct}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedProduct(null)}
      >
        <Pressable
          style={styles.productModalOverlay}
          onPress={() => setSelectedProduct(null)}
        >
          <View
            style={styles.productModalCard}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.productModalHeader}>
              <View>
                <Text style={styles.productModalTitle}>Edit Product</Text>
                <Text style={styles.productModalSubtitle}>
                  Update fruit details or delete item
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                style={styles.productModalCloseBtn}
                onPress={() => setSelectedProduct(null)}
              >
                <AppIcon
                  name="x"
                  size={20}
                  color={THEME.colors.textMuted}
                  strokeWidth={2}
                />
              </Pressable>
            </View>

            <ScrollView
              style={styles.productModalScroll}
              showsVerticalScrollIndicator={false}
            >
              {/* Product Photo */}
              <Text style={styles.productFieldLabel}>Product Photo</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Upload Custom Photo"
                style={[
                  styles.uploadPhotoBtn,

                  (productForm.imageUri || productForm.imageKey) &&
                    styles.uploadPhotoBtnActive,
                ]}
                onPress={handlePickCustomImage}
              >
                {productForm.imageUri ||
                (productForm.imageKey &&
                  FRUIT_IMAGES[
                    (productForm.imageKey as "apple" | "mango" | "banana")
                  ]) ? (
                  <View style={styles.uploadPhotoPreviewRow}>
                    <Image
                      source={
                        productForm.imageUri
                          ? { uri: productForm.imageUri }
                          : FRUIT_IMAGES[
                              (productForm.imageKey as "apple" | "mango" | "banana")
                            ]
                      }
                      style={styles.uploadPhotoPreviewThumb as any}
                      resizeMode="cover"
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.uploadPhotoSuccessTitle}>
                        {productForm.imageUri
                          ? "Custom Photo Added"
                          : "Product Photo"}
                      </Text>
                      <Text style={styles.uploadPhotoSuccessSub}>
                        Tap to change photo
                      </Text>
                    </View>
                    <View style={styles.uploadPhotoChangeBadge}>
                      <AppIcon
                        name="camera"
                        size={13}
                        color="#FFFFFF"
                        strokeWidth={2}
                      />
                      <Text style={styles.uploadPhotoChangeBadgeText}>
                        Change
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.uploadPhotoPlaceholderRow}>
                    <View style={styles.uploadPhotoIconCircle}>
                      <AppIcon
                        name="camera"
                        size={18}
                        color="#121317"
                        strokeWidth={2}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.uploadPhotoTitle}>
                        Upload from Device / Camera
                      </Text>
                      <Text style={styles.uploadPhotoSub}>
                        Select any image or take a photo
                      </Text>
                    </View>
                  </View>
                )}
              </Pressable>

              {/* Name Input */}
              <Text style={styles.productFieldLabel}>Product Name</Text>
              <TextInput
                style={styles.productInput}
                value={productForm.name}
                onChangeText={(text) =>
                  setProductForm((prev) => ({ ...prev, name: text }))
                }
                placeholder="e.g. Red apples"
                placeholderTextColor={THEME.colors.textMuted}
              />

              {/* Price Input */}
              <Text style={styles.productFieldLabel}>Price</Text>
              <TextInput
                style={styles.productInput}
                value={productForm.price}
                onChangeText={(text) =>
                  setProductForm((prev) => ({ ...prev, price: text }))
                }
                placeholder="e.g. $2.50 / kg"
                placeholderTextColor={THEME.colors.textMuted}
              />

              {/* Stock Status Picker */}
              <Text style={styles.productFieldLabel}>Stock Status</Text>
              <View style={styles.stockStatusRow}>
                {(["In stock", "Low stock", "Out of stock"] as const).map(
                  (st) => (
                    <Pressable
                      key={st}
                      accessibilityRole="button"
                      style={[
                        styles.stockStatusBtn,

                        productForm.stock === st && styles.stockStatusBtnActive,
                      ]}
                      onPress={() =>
                        setProductForm((prev) => ({ ...prev, stock: st }))
                      }
                    >
                      <Text
                        style={[
                          styles.stockStatusText,

                          productForm.stock === st &&
                            styles.stockStatusTextActive,
                        ]}
                      >
                        {st}
                      </Text>
                    </Pressable>
                  ),
                )}
              </View>
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.productModalActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Delete Product"
                style={styles.productDeleteBtn}
                onPress={handleDeleteProduct}
              >
                <AppIcon
                  name="trash"
                  size={16}
                  color="#DC2626"
                  strokeWidth={2}
                />
                <Text style={styles.productDeleteBtnText}>Delete</Text>
              </Pressable>

              <View style={styles.productModalRightBtns}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Cancel"
                  style={styles.productCancelBtn}
                  onPress={() => setSelectedProduct(null)}
                >
                  <Text style={styles.productCancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Save Changes"
                  style={styles.productSaveBtn}
                  onPress={handleSaveProductEdit}
                >
                  <Text style={styles.productSaveBtnText}>Save</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* 7. Create Product Modal */}
      <Modal
        visible={isCreateModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCreateModalOpen(false)}
      >
        <Pressable
          style={styles.productModalOverlay}
          onPress={() => setIsCreateModalOpen(false)}
        >
          <View
            style={styles.productModalCard}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.productModalHeader}>
              <View>
                <Text style={styles.productModalTitle}>Add New Product</Text>
                <Text style={styles.productModalSubtitle}>
                  Create a new item in your catalog
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                style={styles.productModalCloseBtn}
                onPress={() => setIsCreateModalOpen(false)}
              >
                <AppIcon
                  name="x"
                  size={20}
                  color={THEME.colors.textMuted}
                  strokeWidth={2}
                />
              </Pressable>
            </View>

            <ScrollView
              style={styles.productModalScroll}
              showsVerticalScrollIndicator={false}
            >
              {/* Product Photo */}
              <Text style={styles.productFieldLabel}>Product Photo</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Upload Custom Photo"
                style={[
                  styles.uploadPhotoBtn,

                  productForm.imageUri && styles.uploadPhotoBtnActive,
                ]}
                onPress={handlePickCustomImage}
              >
                {productForm.imageUri ? (
                  <View style={styles.uploadPhotoPreviewRow}>
                    <Image
                      source={{ uri: productForm.imageUri }}
                      style={styles.uploadPhotoPreviewThumb as any}
                      resizeMode="cover"
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.uploadPhotoSuccessTitle}>
                        Custom Photo Added
                      </Text>
                      <Text style={styles.uploadPhotoSuccessSub}>
                        Tap to change photo
                      </Text>
                    </View>
                    <View style={styles.uploadPhotoChangeBadge}>
                      <AppIcon
                        name="camera"
                        size={13}
                        color="#FFFFFF"
                        strokeWidth={2}
                      />
                      <Text style={styles.uploadPhotoChangeBadgeText}>
                        Change
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.uploadPhotoPlaceholderRow}>
                    <View style={styles.uploadPhotoIconCircle}>
                      <AppIcon
                        name="camera"
                        size={18}
                        color="#121317"
                        strokeWidth={2}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.uploadPhotoTitle}>
                        Upload from Device / Camera
                      </Text>
                      <Text style={styles.uploadPhotoSub}>
                        Select any image or take a photo
                      </Text>
                    </View>
                  </View>
                )}
              </Pressable>

              {/* Name Input */}
              <Text style={styles.productFieldLabel}>Product Name</Text>
              <TextInput
                style={styles.productInput}
                value={productForm.name}
                onChangeText={(text) =>
                  setProductForm((prev) => ({ ...prev, name: text }))
                }
                placeholder="e.g. Fuji Apple"
                placeholderTextColor={THEME.colors.textMuted}
                autoFocus
              />

              {/* Price Input */}
              <Text style={styles.productFieldLabel}>Price</Text>
              <TextInput
                style={styles.productInput}
                value={productForm.price}
                onChangeText={(text) =>
                  setProductForm((prev) => ({ ...prev, price: text }))
                }
                placeholder="e.g. $3.00 / kg"
                placeholderTextColor={THEME.colors.textMuted}
              />

              {/* Stock Status Picker */}
              <Text style={styles.productFieldLabel}>Stock Status</Text>
              <View style={styles.stockStatusRow}>
                {(["In stock", "Low stock", "Out of stock"] as const).map(
                  (st) => (
                    <Pressable
                      key={st}
                      accessibilityRole="button"
                      style={[
                        styles.stockStatusBtn,

                        productForm.stock === st && styles.stockStatusBtnActive,
                      ]}
                      onPress={() =>
                        setProductForm((prev) => ({ ...prev, stock: st }))
                      }
                    >
                      <Text
                        style={[
                          styles.stockStatusText,

                          productForm.stock === st &&
                            styles.stockStatusTextActive,
                        ]}
                      >
                        {st}
                      </Text>
                    </Pressable>
                  ),
                )}
              </View>
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.productModalActions}>
              <View style={{ flex: 1 }} />
              <View style={styles.productModalRightBtns}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Cancel"
                  style={styles.productCancelBtn}
                  onPress={() => setIsCreateModalOpen(false)}
                >
                  <Text style={styles.productCancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Add Product"
                  style={[
                    styles.productSaveBtn,
                    !productForm.name.trim() && { opacity: 0.5 },
                  ]}
                  disabled={!productForm.name.trim()}
                  onPress={handleSaveCreateProduct}
                >
                  <Text style={styles.productSaveBtnText}>Add Product</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* 8. Subscription Upgrade to Pro Modal */}
      <Modal
        visible={subscriptionModalOpen}
        transparent
        animationType="fade"
        onRequestClose={closeSubscriptionModal}
      >
        <Pressable
          style={styles.proModalOverlay}
          onPress={closeSubscriptionModal}
        >
          <View
            style={styles.proModalCard}
            onStartShouldSetResponder={() => true}
          >
            {/* Top Bar with Badge & Close Button */}
            <View style={styles.proModalHeader}>
              <View style={styles.proPlanBadge}>
                <AppIcon
                  name="sparkles"
                  size={14}
                  color="#FFFFFF"
                  strokeWidth={2.5}
                />
                <Text style={styles.proPlanBadgeText}>MUME PRO</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                style={styles.proModalCloseBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                onPress={closeSubscriptionModal}
              >
                <AppIcon name="x" size={18} color="#121317" strokeWidth={2.2} />
              </Pressable>
            </View>

            {/* Title & Value Proposition */}
            <Text style={styles.proModalTitle}>Upgrade to Pro</Text>
            <Text style={styles.proModalSubtitle}>
              Unlock unlimited capabilities to scale your store catalog and chat
              with AI effortlessly.
            </Text>

            {/* Pricing Banner */}
            <View style={styles.proPriceBox}>
              <View style={styles.proPriceHeader}>
                <Text style={styles.proPriceTier}>Pro Store Membership</Text>
                <View style={styles.proPriceTag}>
                  <Text style={styles.proPriceTagText}>Most Popular</Text>
                </View>
              </View>
              <View style={styles.proPriceAmountRow}>
                <Text style={styles.proPriceCurrency}>$</Text>
                <Text style={styles.proPriceNumber}>9.99</Text>
                <Text style={styles.proPricePeriod}>/ month</Text>
              </View>
              <Text style={styles.proPriceGuarantee}>
                7-day free trial · Cancel anytime with 1-tap
              </Text>
            </View>

            {/* Feature Highlights */}
            <View style={styles.proFeaturesList}>
              <View style={styles.proFeatureItem}>
                <View style={styles.proFeatureIconCircle}>
                  <AppIcon
                    name="folder"
                    size={18}
                    color="#121317"
                    strokeWidth={2.2}
                  />
                </View>
                <View style={styles.proFeatureTextCol}>
                  <Text style={styles.proFeatureTitle}>
                    Additional Product Space for Catalog
                  </Text>
                  <Text style={styles.proFeatureDesc}>
                    Unlimited inventory items, high-res custom photo uploads,
                    and variant management.
                  </Text>
                </View>
              </View>

              <View style={styles.proFeatureItem}>
                <View style={styles.proFeatureIconCircle}>
                  <AppIcon
                    name="mic"
                    size={18}
                    color="#121317"
                    strokeWidth={2.2}
                  />
                </View>
                <View style={styles.proFeatureTextCol}>
                  <Text style={styles.proFeatureTitle}>
                    Unlimited Voice Chat
                  </Text>
                  <Text style={styles.proFeatureDesc}>
                    Dictate commands, inquire about stock, and draft replies
                    with zero audio timeouts.
                  </Text>
                </View>
              </View>

              <View style={styles.proFeatureItem}>
                <View style={styles.proFeatureIconCircle}>
                  <AppIcon
                    name="bot"
                    size={18}
                    color="#121317"
                    strokeWidth={2.2}
                  />
                </View>
                <View style={styles.proFeatureTextCol}>
                  <Text style={styles.proFeatureTitle}>
                    24/7 Meta Messenger Auto-Sync
                  </Text>
                  <Text style={styles.proFeatureDesc}>
                    Instant price inquiry detection and automated smart reply
                    generation.
                  </Text>
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.proModalActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  isProUser ? "Pro Plan" : "Start 7-Day Free Trial"
                }
                style={[
                  styles.proUpgradeBtn,
                  isProUser && styles.proUpgradeBtnActive,
                ]}
                onPress={() => {
                  if (proAutoCloseTimerRef.current) {
                    clearTimeout(proAutoCloseTimerRef.current)

                    proAutoCloseTimerRef.current = null
                  }

                  setIsProUser(true)

                  setSubscriptionModalOpen(false)

                  setProToast(true)

                  setTimeout(() => setProToast(false), 3500)
                }}
              >
                <AppIcon
                  name={isProUser ? "check" : "subscription-upgrade"}
                  size={18}
                  color="#FFFFFF"
                  strokeWidth={2.2}
                />
                <Text style={styles.proUpgradeBtnText}>
                  {isProUser ? "Pro Plan" : "Start 7-Day Free Trial"}
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Maybe Later"
                style={styles.proDismissBtn}
                onPress={closeSubscriptionModal}
              >
                <Text style={styles.proDismissBtnText}>Maybe Later</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* 5. Animated Success Toast */}
      {sentToast && (
        <View style={styles.toast}>
          <AppIcon name="check" size={18} color="#FFFFFF" strokeWidth={2.5} />
          <Text style={styles.toastText}>{sentToastText}</Text>
        </View>
      )}

      {/* Pro Subscription Toast */}
      {proToast && (
        <View style={styles.toast}>
          <AppIcon
            name="sparkles"
            size={18}
            color="#FACC15"
            strokeWidth={2.5}
          />
          <Text style={styles.toastText}>
            Welcome to Mume Pro! Unlimited features unlocked.
          </Text>
        </View>
      )}
    </View>
  )
}

