import { Routes, Route } from 'react-router-dom'
import Home from '../pages/Home/Home'
import Login from '../pages/Login/Login'
import About from '../pages/AboutUs/About'
import Contact from '../pages/ContactUs/Contact'

const AppRouter = () => {
    return (
        <Routes>
            <Route path='/' element={<Home />} />
            <Route path='/login' element={<Login />} />
            <Route path='/about-us' element={<About />} />
            <Route path='/contact-us' element={<Contact />} />
            {/* <Route path='/about' element={<About />} />  */}
        </Routes>
    )
}

export default AppRouter