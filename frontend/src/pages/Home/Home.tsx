import Footer from '../../components/Footer/Footer';
import Header from '../../components/Header/Header';

export default function Home() {
    return (
        <div>
            <header>
                <Header />
            </header>

            {/* loggedin confirmation */}
            {localStorage.getItem('artistToken') && (
                <p>You are logged in!</p>
            )}

            <h1>Home page</h1>

            <footer>
                <Footer />
            </footer>
        </div>
    )
}