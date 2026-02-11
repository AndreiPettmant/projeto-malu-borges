import { useEffect, useState, useRef, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import {
  Save, Loader2, Trash2, Settings, Instagram, Upload, Film, Image as ImageIcon,
  Eye, EyeOff, Play, ChevronUp, ChevronDown,
} from 'lucide-react'

interface VideoItem {
  url: string
  title: string
  active?: boolean
}

interface PhotoItem {
  url: string
  caption: string
  active?: boolean
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''

export default function HomeConfigPage() {
  const [heroTitle, setHeroTitle] = useState('')
  const [heroSubtitle, setHeroSubtitle] = useState('')
  const [aboutText, setAboutText] = useState('')
  const [aboutImage, setAboutImage] = useState('')
  const [instagramUrl, setInstagramUrl] = useState('')
  const [contatoTexto, setContatoTexto] = useState('')
  const [videos, setVideos] = useState<VideoItem[]>([])
  const [photos, setPhotos] = useState<PhotoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  // Upload states
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [uploadingProfileImg, setUploadingProfileImg] = useState(false)
  const [uploadMsg, setUploadMsg] = useState('')
  const videoInputRef = useRef<HTMLInputElement>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const profileImgInputRef = useRef<HTMLInputElement>(null)

  // Preview de vídeo
  const [previewVideo, setPreviewVideo] = useState<number | null>(null)

  useEffect(() => {
    loadConfig()
  }, [])

  async function loadConfig() {
    try {
      const { data } = await supabase.from('home_config').select('*')
      if (data) {
        const map: Record<string, string> = {}
        data.forEach((item: { section: string; key: string; value: string }) => {
          map[`${item.section}.${item.key}`] = item.value
        })
        setHeroTitle(map['hero.titulo'] || '')
        setHeroSubtitle(map['hero.subtitulo'] || '')
        setAboutText(map['sobre.texto'] || '')
        setAboutImage(map['sobre.imagem'] || '')
        setInstagramUrl(map['contato.instagram'] || '')
        setContatoTexto(map['contato.texto'] || '')
        try { setVideos(JSON.parse(map['carrossel.videos'] || '[]')) } catch { setVideos([]) }
        try { setPhotos(JSON.parse(map['portfolio.fotos'] || '[]')) } catch { setPhotos([]) }
      }
    } catch (err) {
      console.error('Erro ao carregar config:', err)
    } finally {
      setLoading(false)
    }
  }

  async function upsertConfig(section: string, key: string, value: string) {
    const { data } = await supabase.from('home_config').select('id').eq('section', section).eq('key', key).single()
    if (data) {
      await supabase.from('home_config').update({ value, updated_at: new Date().toISOString() }).eq('id', data.id)
    } else {
      await supabase.from('home_config').insert({ section, key, value })
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSuccess(false)
    try {
      await Promise.all([
        upsertConfig('hero', 'titulo', heroTitle),
        upsertConfig('hero', 'subtitulo', heroSubtitle),
        upsertConfig('sobre', 'texto', aboutText),
        upsertConfig('sobre', 'imagem', aboutImage),
        upsertConfig('contato', 'instagram', instagramUrl),
        upsertConfig('contato', 'texto', contatoTexto),
        upsertConfig('carrossel', 'videos', JSON.stringify(videos)),
        upsertConfig('portfolio', 'fotos', JSON.stringify(photos)),
      ])
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      console.error('Erro ao salvar config:', err)
    } finally {
      setSaving(false)
    }
  }

  // ======================== UPLOAD DE VÍDEO ========================
  async function handleVideoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['video/mp4', 'video/webm', 'video/quicktime'].includes(file.type)) { alert('Use MP4, WebM ou MOV.'); return }
    if (file.size > 104857600) { alert('Máximo: 100MB.'); return }

    setUploadingVideo(true)
    setUploadMsg(`Enviando ${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)...`)
    try {
      const fileName = `video_${Date.now()}.${file.name.split('.').pop()?.toLowerCase() || 'mp4'}`
      const { error } = await supabase.storage.from('videos').upload(fileName, file, { cacheControl: '3600', upsert: false })
      if (error) throw error
      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/videos/${fileName}`
      setVideos((prev) => [...prev, { url: publicUrl, title: '', active: true }])
    } catch (err) {
      console.error('Erro no upload:', err)
      alert('Erro ao enviar vídeo.')
    } finally {
      setUploadingVideo(false)
      setUploadMsg('')
      if (videoInputRef.current) videoInputRef.current.value = ''
    }
  }

  async function removeVideo(index: number) {
    const video = videos[index]
    if (!confirm('Excluir este vídeo permanentemente?')) return
    if (video.url.includes('/storage/v1/object/public/videos/')) {
      const fileName = video.url.split('/videos/').pop()
      if (fileName) await supabase.storage.from('videos').remove([fileName])
    }
    setVideos(videos.filter((_, i) => i !== index))
  }

  function toggleVideoActive(index: number) {
    setVideos((prev) => prev.map((v, i) => i === index ? { ...v, active: v.active === false ? true : false } : v))
  }

  function moveVideo(from: number, to: number) {
    if (to < 0 || to >= videos.length) return
    const updated = [...videos]
    const [moved] = updated.splice(from, 1)
    updated.splice(to, 0, moved)
    setVideos(updated)
  }

  // ======================== UPLOAD DE FOTO ========================
  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploadingPhoto(true)
    setUploadMsg(`Enviando ${files.length} foto(s)...`)

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) continue
        if (file.size > 10485760) continue

        const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
        const fileName = `foto_${Date.now()}_${i}.${ext}`
        const { error } = await supabase.storage.from('images').upload(fileName, file, { cacheControl: '3600', upsert: false })
        if (error) throw error
        const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/images/${fileName}`
        setPhotos((prev) => [...prev, { url: publicUrl, caption: '', active: true }])
      }
    } catch (err) {
      console.error('Erro no upload:', err)
      alert('Erro ao enviar foto.')
    } finally {
      setUploadingPhoto(false)
      setUploadMsg('')
      if (photoInputRef.current) photoInputRef.current.value = ''
    }
  }

  async function removePhoto(index: number) {
    const photo = photos[index]
    if (!confirm('Excluir esta foto permanentemente?')) return
    if (photo.url.includes('/storage/v1/object/public/images/')) {
      const fileName = photo.url.split('/images/').pop()
      if (fileName) await supabase.storage.from('images').remove([fileName])
    }
    setPhotos(photos.filter((_, i) => i !== index))
  }

  function togglePhotoActive(index: number) {
    setPhotos((prev) => prev.map((p, i) => i === index ? { ...p, active: p.active === false ? true : false } : p))
  }

  // ======================== UPLOAD IMAGEM PERFIL ========================
  async function handleProfileImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { alert('Use JPG, PNG ou WebP.'); return }

    setUploadingProfileImg(true)
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const fileName = `perfil_${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('images').upload(fileName, file, { cacheControl: '3600', upsert: false })
      if (error) throw error
      setAboutImage(`${SUPABASE_URL}/storage/v1/object/public/images/${fileName}`)
    } catch (err) {
      console.error('Erro no upload:', err)
      alert('Erro ao enviar imagem.')
    } finally {
      setUploadingProfileImg(false)
      if (profileImgInputRef.current) profileImgInputRef.current.value = ''
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
      </div>
    )
  }

  const activeVideos = videos.filter((v) => v.active !== false).length
  const activePhotos = photos.filter((p) => p.active !== false).length

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Settings size={24} /> Configuração da Home
        </h1>
        <p className="text-gray-500 mt-1">Edite o conteúdo da página institucional</p>
      </div>

      {success && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
          Configurações salvas com sucesso!
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Hero */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Seção Hero</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Título principal</label>
            <input type="text" value={heroTitle} onChange={(e) => setHeroTitle(e.target.value)} placeholder="Malu Borges" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-gray-800" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subtítulo</label>
            <input type="text" value={heroSubtitle} onChange={(e) => setHeroSubtitle(e.target.value)} placeholder="Criadora de conteúdo..." className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-gray-800" />
          </div>
        </div>

        {/* Sobre */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Seção Sobre</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Texto "Quem sou eu"</label>
            <textarea value={aboutText} onChange={(e) => setAboutText(e.target.value)} rows={4} placeholder="Conte sobre você..." className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-gray-800 resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Foto de perfil</label>
            <p className="text-xs text-gray-400 mb-2">
              Tamanho recomendado: <span className="font-semibold text-gray-500">800 × 800 px</span> (quadrada, proporção 1:1). Mínimo: 400 × 400 px.
              <br />Imagens fora da proporção 1:1 serão <span className="text-amber-500 font-medium">cortadas automaticamente</span> para encaixar no formato quadrado.
            </p>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                {aboutImage ? (
                  <img src={aboutImage} alt="Perfil" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <ImageIcon size={24} />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <input ref={profileImgInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleProfileImageUpload} className="hidden" />
                <button type="button" onClick={() => profileImgInputRef.current?.click()} disabled={uploadingProfileImg} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition disabled:opacity-50">
                  {uploadingProfileImg ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  {uploadingProfileImg ? 'Enviando...' : 'Enviar foto'}
                </button>
                {aboutImage && (
                  <button type="button" onClick={() => setAboutImage('')} className="ml-2 text-xs text-gray-400 hover:text-red-500">Remover</button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Contato */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Instagram size={18} /> Seção Contato
          </h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Texto de contato</label>
            <input type="text" value={contatoTexto} onChange={(e) => setContatoTexto(e.target.value)} placeholder="Entre em contato para parcerias e campanhas" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-gray-800" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Link do Instagram</label>
            <input type="url" value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} placeholder="https://www.instagram.com/maluborgesm/" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-gray-800 font-mono text-xs" />
          </div>
        </div>

        {/* ======================== FOTOS / PORTFÓLIO ======================== */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <ImageIcon size={18} /> Galeria de Fotos (*Seção de Portfolio/Trabalhos*)
              </h2>
              <p className="text-xs text-gray-400 mt-1">{activePhotos} foto(s) ativa(s) de {photos.length} total</p>
            </div>
          </div>

          {/* Disclaimer de dimensão */}
          <div className="px-4 py-3 rounded-xl bg-gray-50 border border-gray-100">
            <p className="text-xs text-gray-500">
              <span className="font-semibold text-gray-600">Dimensão recomendada:</span>{' '}
              <span className="font-semibold text-gray-700">1920 × 1080 px</span> (paisagem, proporção 16:9).
              Mínimo: 1280 × 720 px.
            </p>
            <p className="text-xs text-amber-500 font-medium mt-1">
              Imagens fora da proporção 16:9 serão cortadas automaticamente para encaixar no carrossel.
            </p>
          </div>

          {/* Upload de fotos */}
          <div
            onClick={() => !uploadingPhoto && photoInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition ${
              uploadingPhoto ? 'border-gray-300 bg-gray-50 cursor-wait' : 'border-gray-200 hover:border-gray-400 hover:bg-gray-50'
            }`}
          >
            <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple onChange={handlePhotoUpload} className="hidden" />
            {uploadingPhoto ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 size={24} className="animate-spin text-gray-400" />
                <p className="text-sm text-gray-500">{uploadMsg}</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1">
                <Upload size={24} className="text-gray-400" />
                <p className="text-sm text-gray-600 font-medium">Clique para enviar fotos</p>
                <p className="text-xs text-gray-400">JPG, PNG, WebP ou GIF — até 10MB — selecione várias</p>
              </div>
            )}
          </div>

          {/* Grid de fotos */}
          {photos.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {photos.map((photo, i) => (
                <div key={i} className={`relative group rounded-xl overflow-hidden border-2 transition ${photo.active === false ? 'border-gray-200 opacity-50' : 'border-transparent'}`}>
                  <div className="aspect-square">
                    <img src={photo.url} alt={photo.caption || `Foto ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                  {/* Overlay com ações */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    <button type="button" onClick={() => togglePhotoActive(i)} className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center text-gray-700 hover:bg-white transition" title={photo.active === false ? 'Ativar' : 'Inativar'}>
                      {photo.active === false ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>
                    <button type="button" onClick={() => removePhoto(i)} className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center text-red-500 hover:bg-white transition" title="Excluir">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  {/* Badge inativo */}
                  {photo.active === false && (
                    <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-gray-900/70 text-white text-[10px] font-medium">
                      Inativo
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ======================== VÍDEOS ======================== */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Film size={18} /> Carrossel de Vídeos
              </h2>
              <p className="text-xs text-gray-400 mt-1">{activeVideos} vídeo(s) ativo(s) de {videos.length} total</p>
            </div>
          </div>

          {/* Upload de vídeo */}
          <div
            onClick={() => !uploadingVideo && videoInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition ${
              uploadingVideo ? 'border-gray-300 bg-gray-50 cursor-wait' : 'border-gray-200 hover:border-gray-400 hover:bg-gray-50'
            }`}
          >
            <input ref={videoInputRef} type="file" accept="video/mp4,video/webm,video/quicktime" onChange={handleVideoUpload} className="hidden" />
            {uploadingVideo ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 size={24} className="animate-spin text-gray-400" />
                <p className="text-sm text-gray-500">{uploadMsg}</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1">
                <Upload size={24} className="text-gray-400" />
                <p className="text-sm text-gray-600 font-medium">Clique para enviar um vídeo</p>
                <p className="text-xs text-gray-400">MP4, WebM ou MOV — até 100MB</p>
              </div>
            )}
          </div>

          {/* Lista de vídeos com preview */}
          {videos.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-2">Nenhum vídeo adicionado.</p>
          ) : (
            <div className="space-y-3">
              {videos.map((video, i) => (
                <div key={i} className={`rounded-xl border transition overflow-hidden ${video.active === false ? 'border-gray-200 bg-gray-50 opacity-60' : 'border-gray-100 bg-gray-50'}`}>
                  <div className="flex gap-3 items-center p-3">
                    {/* Thumbnail clicável */}
                    <button
                      type="button"
                      onClick={() => setPreviewVideo(previewVideo === i ? null : i)}
                      className="w-14 h-18 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0 relative group"
                    >
                      <video src={video.url} className="w-full h-full object-cover" muted preload="metadata" />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                        <Play size={14} className="text-white" />
                      </div>
                    </button>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <input
                        type="text"
                        value={video.title}
                        onChange={(e) => {
                          const updated = [...videos]
                          updated[i] = { ...updated[i], title: e.target.value }
                          setVideos(updated)
                        }}
                        placeholder="Título (opcional)"
                        className="w-full px-3 py-1.5 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-800"
                      />
                      <div className="flex items-center gap-2 mt-1 px-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                        <span className="text-xs text-gray-400">Supabase Storage</span>
                        {video.active === false && <span className="text-xs text-amber-500 font-medium">• Inativo</span>}
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button type="button" onClick={() => moveVideo(i, i - 1)} disabled={i === 0} className="p-1.5 text-gray-300 hover:text-gray-600 rounded-lg disabled:opacity-20" title="Subir">
                        <ChevronUp size={14} />
                      </button>
                      <button type="button" onClick={() => moveVideo(i, i + 1)} disabled={i === videos.length - 1} className="p-1.5 text-gray-300 hover:text-gray-600 rounded-lg disabled:opacity-20" title="Descer">
                        <ChevronDown size={14} />
                      </button>
                      <button type="button" onClick={() => toggleVideoActive(i)} className={`p-1.5 rounded-lg transition ${video.active === false ? 'text-emerald-500 hover:bg-emerald-50' : 'text-amber-500 hover:bg-amber-50'}`} title={video.active === false ? 'Ativar' : 'Inativar'}>
                        {video.active === false ? <Eye size={15} /> : <EyeOff size={15} />}
                      </button>
                      <button type="button" onClick={() => removeVideo(i)} className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition" title="Excluir">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Preview expandido */}
                  {previewVideo === i && (
                    <div className="border-t border-gray-200 bg-black">
                      <div className="aspect-[9/16] max-h-[400px] mx-auto">
                        <video src={video.url} className="w-full h-full object-contain" controls autoPlay muted playsInline />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gray-900 text-white font-medium text-sm hover:bg-gray-800 transition disabled:opacity-50">
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            Salvar Configurações
          </button>
        </div>
      </form>
    </div>
  )
}
