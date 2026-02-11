import { useEffect, useState, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Instagram, ChevronLeft, ChevronRight, Volume2, VolumeX, Image as ImageIcon } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { HomeConfig } from '../types'

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

export default function HeroPage() {
  const [config, setConfig] = useState<Record<string, string>>({})
  const [videos, setVideos] = useState<VideoItem[]>([])
  const [photos, setPhotos] = useState<PhotoItem[]>([])

  // Carrossel de vídeos
  const [currentVideo, setCurrentVideo] = useState(0)
  const [isMuted, setIsMuted] = useState(true)
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])

  // Carrossel de fotos
  const [currentPhoto, setCurrentPhoto] = useState(0)

  useEffect(() => {
    loadConfig()
  }, [])

  // Auto-play vídeo ao mudar slide
  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      if (!video) return
      if (index === currentVideo) {
        video.currentTime = 0
        video.play().catch(() => {})
      } else {
        video.pause()
      }
    })
  }, [currentVideo])

  // Auto-rotate fotos (5 segundos)
  const activePhotos = photos.filter((p) => p.active !== false)
  useEffect(() => {
    if (activePhotos.length <= 1) return
    const timer = setInterval(() => {
      setCurrentPhoto((prev) => (prev + 1) % activePhotos.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [activePhotos.length])

  async function loadConfig() {
    try {
      const { data } = await supabase.from('home_config').select('*')
      if (data) {
        const map: Record<string, string> = {}
        data.forEach((item: HomeConfig) => {
          map[`${item.section}.${item.key}`] = item.value
        })
        setConfig(map)
        try { setVideos(JSON.parse(map['carrossel.videos'] || '[]')) } catch { setVideos([]) }
        try { setPhotos(JSON.parse(map['portfolio.fotos'] || '[]')) } catch { setPhotos([]) }
      }
    } catch (err) {
      console.error('Erro ao carregar config da Home:', err)
    }
  }

  const heroTitle = config['hero.titulo'] || 'Malu Borges'
  const heroSubtitle = config['hero.subtitulo'] || 'Criadora de conteúdo, influenciadora digital e estrategista de campanhas.'
  const aboutText = config['sobre.texto'] || 'Apaixonada por criar conteúdos autênticos que conectam marcas a pessoas reais. Com experiência em campanhas para diversas marcas, transformo briefings em histórias que engajam.'
  const aboutImage = config['sobre.imagem'] || ''
  const instagramUrl = config['contato.instagram'] || 'https://www.instagram.com/maluborgesm/'
  const contatoTexto = config['contato.texto'] || 'Entre em contato para parcerias e campanhas'

  // Apenas vídeos ativos
  const activeVideos = videos.filter((v) => v.active !== false)

  // ======================== NAVEGAÇÃO VÍDEOS ========================
  const goToVideo = useCallback((index: number) => {
    if (index < 0) setCurrentVideo(activeVideos.length - 1)
    else if (index >= activeVideos.length) setCurrentVideo(0)
    else setCurrentVideo(index)
  }, [activeVideos.length])

  const prevVideo = useCallback(() => goToVideo(currentVideo - 1), [currentVideo, goToVideo])
  const nextVideo = useCallback(() => goToVideo(currentVideo + 1), [currentVideo, goToVideo])

  function toggleMute() {
    setIsMuted((prev) => !prev)
    videoRefs.current.forEach((video) => {
      if (video) video.muted = !isMuted
    })
  }

  // ======================== NAVEGAÇÃO FOTOS ========================
  function goToPhoto(index: number) {
    if (index < 0) setCurrentPhoto(activePhotos.length - 1)
    else if (index >= activePhotos.length) setCurrentPhoto(0)
    else setCurrentPhoto(index)
  }

  // Swipe
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [swipeTarget, setSwipeTarget] = useState<'video' | 'photo' | null>(null)

  function handleTouchStart(target: 'video' | 'photo') {
    return (e: React.TouchEvent) => {
      setTouchStart(e.touches[0].clientX)
      setSwipeTarget(target)
    }
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStart === null) return
    const diff = touchStart - e.changedTouches[0].clientX
    if (Math.abs(diff) > 50) {
      if (swipeTarget === 'video') {
        diff > 0 ? nextVideo() : prevVideo()
      } else if (swipeTarget === 'photo') {
        diff > 0 ? goToPhoto(currentPhoto + 1) : goToPhoto(currentPhoto - 1)
      }
    }
    setTouchStart(null)
    setSwipeTarget(null)
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gray-900 text-white flex items-center justify-center text-sm font-bold">MB</div>
            <span className="font-bold text-gray-900 text-lg">Malu Borges</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-600">
            <a href="#sobre" className="hover:text-gray-900 transition">Sobre</a>
            <a href="#portfolio" className="hover:text-gray-900 transition">Portfólio</a>
            <a href="#videos" className="hover:text-gray-900 transition">Conteúdo</a>
            <a href="#contato" className="hover:text-gray-900 transition">Contato</a>
          </div>
          <Link to="/login" className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition">
            Área Restrita
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12">
          <div className="flex-1 text-center lg:text-left">
            <h1 className="text-5xl lg:text-7xl font-bold text-gray-900 leading-tight">{heroTitle}</h1>
            <p className="text-xl text-gray-500 mt-6 max-w-xl">{heroSubtitle}</p>
            <div className="flex flex-col sm:flex-row gap-4 mt-8 justify-center lg:justify-start">
              <a href="#portfolio" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gray-900 text-white font-medium hover:bg-gray-800 transition">
                Ver Portfólio <ArrowRight size={18} />
              </a>
              <a href="#videos" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-medium hover:border-gray-300 hover:text-gray-900 transition">
                <Instagram size={18} /> Ver Conteúdo
              </a>
            </div>
          </div>
          <div className="flex-1 flex justify-center">
            <div className="w-80 h-80 lg:w-96 lg:h-96 rounded-3xl bg-gradient-to-br from-gray-200 via-gray-100 to-gray-100 flex items-center justify-center overflow-hidden">
              {aboutImage ? (
                <img src={aboutImage} alt="Malu Borges" className="w-full h-full object-cover" />
              ) : (
                <span className="text-8xl font-bold text-gray-300">MB</span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Sobre */}
      <section id="sobre" className="py-20 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Quem sou eu</h2>
          <div className="w-16 h-1 bg-gray-900 rounded-full mx-auto mb-8" />
          <p className="text-lg text-gray-600 leading-relaxed">{aboutText}</p>
        </div>
      </section>

      {/* Portfólio / Galeria de Fotos */}
      <section id="portfolio" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-2">Trabalhos</h2>
          <div className="w-16 h-1 bg-gray-900 rounded-full mx-auto mb-12" />

          {activePhotos.length > 0 ? (
            <div className="flex flex-col items-center">
              {/* Carrossel de fotos */}
              <div
                className="relative w-full max-w-4xl"
                onTouchStart={handleTouchStart('photo')}
                onTouchEnd={handleTouchEnd}
              >
                {/* Setas */}
                {activePhotos.length > 1 && (
                  <>
                    <button
                      onClick={() => goToPhoto(currentPhoto - 1)}
                      className="absolute -left-5 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-white shadow-lg border border-gray-200 items-center justify-center text-gray-500 hover:text-gray-900 transition hidden md:flex"
                    >
                      <ChevronLeft size={22} />
                    </button>
                    <button
                      onClick={() => goToPhoto(currentPhoto + 1)}
                      className="absolute -right-5 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-white shadow-lg border border-gray-200 items-center justify-center text-gray-500 hover:text-gray-900 transition hidden md:flex"
                    >
                      <ChevronRight size={22} />
                    </button>
                  </>
                )}

                {/* Slide */}
                <div className="overflow-hidden rounded-2xl">
                  <div
                    className="flex transition-transform duration-700 ease-in-out"
                    style={{ transform: `translateX(-${currentPhoto * 100}%)` }}
                  >
                    {activePhotos.map((photo, index) => (
                      <div key={index} className="w-full flex-shrink-0">
                        <div className="aspect-[16/9] w-full bg-gray-100 relative">
                          <img
                            src={photo.url}
                            alt={photo.caption || `Foto ${index + 1}`}
                            className="w-full h-full object-cover"
                            loading={index <= 1 ? 'eager' : 'lazy'}
                          />
                          {photo.caption && (
                            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
                              <p className="text-white text-sm font-medium">{photo.caption}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bolinhas */}
              {activePhotos.length > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  {activePhotos.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => goToPhoto(index)}
                      className={`rounded-full transition-all duration-300 ${
                        index === currentPhoto ? 'w-8 h-3 bg-gray-900' : 'w-3 h-3 bg-gray-300 hover:bg-gray-400'
                      }`}
                      aria-label={`Foto ${index + 1}`}
                    />
                  ))}
                </div>
              )}

              {/* Setas mobile */}
              {activePhotos.length > 1 && (
                <div className="flex items-center gap-4 mt-4 md:hidden">
                  <button onClick={() => goToPhoto(currentPhoto - 1)} className="w-10 h-10 rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center text-gray-500">
                    <ChevronLeft size={20} />
                  </button>
                  <button onClick={() => goToPhoto(currentPhoto + 1)} className="w-10 h-10 rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center text-gray-500">
                    <ChevronRight size={20} />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="aspect-square rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center border border-gray-100">
                  <div className="text-center text-gray-300">
                    <ImageIcon size={32} className="mx-auto mb-2" />
                    <span className="text-sm">Foto {i}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Carrossel de Vídeos */}
      <section id="videos" className="py-20 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-2">Conteúdo Recente</h2>
          <div className="w-16 h-1 bg-gray-900 rounded-full mx-auto mb-4" />
          <p className="text-center text-gray-500 mb-10">Acompanhe meus últimos vídeos e publicações</p>

          {activeVideos.length > 0 ? (
            <div className="flex flex-col items-center">
              <div
                className="relative w-full max-w-[380px]"
                onTouchStart={handleTouchStart('video')}
                onTouchEnd={handleTouchEnd}
              >
                {activeVideos.length > 1 && (
                  <>
                    <button onClick={prevVideo} className="absolute -left-14 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-white shadow-lg border border-gray-200 items-center justify-center text-gray-500 hover:text-gray-900 transition hidden sm:flex">
                      <ChevronLeft size={22} />
                    </button>
                    <button onClick={nextVideo} className="absolute -right-14 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-white shadow-lg border border-gray-200 items-center justify-center text-gray-500 hover:text-gray-900 transition hidden sm:flex">
                      <ChevronRight size={22} />
                    </button>
                  </>
                )}

                <div className="overflow-hidden rounded-2xl bg-black shadow-xl">
                  <div className="flex transition-transform duration-500 ease-in-out" style={{ transform: `translateX(-${currentVideo * 100}%)` }}>
                    {activeVideos.map((video, index) => (
                      <div key={index} className="w-full flex-shrink-0 relative">
                        <div className="aspect-[9/16] w-full bg-black">
                          <video
                            ref={(el) => { videoRefs.current[index] = el }}
                            src={video.url}
                            className="w-full h-full object-contain"
                            loop muted={isMuted} playsInline
                            preload={index <= 1 ? 'metadata' : 'none'}
                            onClick={(e) => { const v = e.currentTarget; v.paused ? v.play().catch(() => {}) : v.pause() }}
                          />
                        </div>
                        {video.title && (
                          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
                            <p className="text-white text-sm font-medium">{video.title}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <button onClick={toggleMute} className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/70 transition">
                    {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  </button>
                  <div className="absolute top-4 left-4 z-10 px-3 py-1 rounded-full bg-black/50 backdrop-blur-sm text-white text-xs font-medium">
                    {currentVideo + 1} / {activeVideos.length}
                  </div>
                </div>
              </div>

              {activeVideos.length > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  {activeVideos.map((_, index) => (
                    <button key={index} onClick={() => goToVideo(index)} className={`rounded-full transition-all duration-300 ${index === currentVideo ? 'w-8 h-3 bg-gray-900' : 'w-3 h-3 bg-gray-300 hover:bg-gray-400'}`} aria-label={`Vídeo ${index + 1}`} />
                  ))}
                </div>
              )}

              {activeVideos.length > 1 && (
                <div className="flex items-center gap-4 mt-4 sm:hidden">
                  <button onClick={prevVideo} className="w-11 h-11 rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center text-gray-500"><ChevronLeft size={22} /></button>
                  <button onClick={nextVideo} className="w-11 h-11 rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center text-gray-500"><ChevronRight size={22} /></button>
                </div>
              )}
            </div>
          ) : (
            <div className="max-w-[380px] mx-auto aspect-[9/16] rounded-2xl bg-black flex items-center justify-center">
              <div className="text-center text-gray-500">
                <Instagram size={48} className="mx-auto mb-3 opacity-50" />
                <p className="text-sm">Conteúdo será configurado pelo<br />painel administrativo</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Contato */}
      <section id="contato" className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Contato</h2>
          <div className="w-16 h-1 bg-gray-900 rounded-full mx-auto mb-8" />
          <p className="text-gray-600 mb-8">{contatoTexto}</p>
          <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gray-900 text-white font-medium hover:bg-gray-800 transition text-lg">
            <Instagram size={24} /> Siga no Instagram
          </a>
          <p className="text-sm text-gray-400 mt-4">
            @{instagramUrl.replace(/https?:\/\/(www\.)?instagram\.com\//, '').replace(/[/?].*$/, '')}
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-gray-100">
        <div className="max-w-7xl mx-auto text-center text-sm text-gray-400">
          Malu Borges &copy; {new Date().getFullYear()} &middot; Todos os direitos reservados
        </div>
      </footer>
    </div>
  )
}
