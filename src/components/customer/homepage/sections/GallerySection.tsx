'use client'
import { HomepageConfig } from '@/types/database'

export default function GallerySection({
    gallery,
    accent,
}: {
    gallery: HomepageConfig['gallery']
    accent?: string
}) {
    const items = (gallery || []).filter((g) => g.image_url)
    if (items.length === 0) return null

    return (
        <section className="py-16 md:py-24 px-4 bg-white">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold text-gray-900">Gallery</h2>
                    <div className="w-16 h-1 mx-auto mt-3 rounded-full" style={{ backgroundColor: accent || '#EC4899' }} />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                    {items.map((item, idx) => {
                        const isVideo = item.media_type === 'video' || item.image_url.match(/\.(mp4|webm|mov)(\?.*)?$/i)
                        return (
                        <figure
                            key={idx}
                            className="group relative overflow-hidden rounded-xl aspect-square bg-gray-100"
                        >
                            {isVideo ? (
                                <video
                                    src={item.image_url}
                                    className="w-full h-full object-cover transition duration-500 group-hover:scale-110"
                                    autoPlay muted loop playsInline
                                />
                            ) : (
                                <img
                                    src={item.image_url}
                                    alt={item.caption || `Gallery image ${idx + 1}`}
                                    loading="lazy"
                                    className="w-full h-full object-cover transition duration-500 group-hover:scale-110"
                                />
                            )}
                            {item.caption && (
                                <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent text-white text-sm p-3 opacity-0 group-hover:opacity-100 transition">
                                    {item.caption}
                                </figcaption>
                            )}
                        </figure>
                    )})}
                </div>
            </div>
        </section>
    )
}
