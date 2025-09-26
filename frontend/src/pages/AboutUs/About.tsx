import './About.css'

const artForms = [
    'Doodle Art',
    'Pichwai Art',
    'Mural Art',
    'Stone Paintings',
    'Warli Paintings',
    'Decoupage',
    'Tanjore Paintings',
    'Madhubani',
    'Block Printing',
    'Miniature Paintings',
    'Mixed Media & Collage',
]

export default function About() {
    return (
        <div className="about-page container">
            <header className="about-hero">
                <h1>About Art with Sucha</h1>
                <p className="lead">A curated collection celebrating traditional and contemporary Indian arts—handmade with care.</p>
            </header>

            <section className="about-grid">
                <div className="about-card intro">
                    <h3>What we showcase</h3>
                    <p>We showcase a wide variety of art forms and crafts — from intricate traditional techniques to playful modern expressions. Each piece is crafted with attention to detail, color and story.</p>
                    <ul className="art-list">
                        {artForms.map((a) => (
                            <li key={a}>{a}</li>
                        ))}
                    </ul>
                </div>

                <div className="about-card gallery">
                    <div className="gallery-grid">
                        <img src="/maa.png" alt="sample art 1" />
                        <img src="/image.png" alt="sample art 2" />
                        <img src="/image2.png" alt="sample art 3" />
                        <img src="/image3.png" alt="sample art 4" />
                    </div>
                </div>
            </section>
        </div>
    )
}