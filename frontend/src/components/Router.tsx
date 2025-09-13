import { Routes, Route } from 'react-router-dom'
import Home from '../pages/Home/Home'
import Login from '../pages/Login/Login'
import About from '../pages/AboutUs/About'
import Contact from '../pages/ContactUs/Contact'
import SectionView from '../pages/Gallery/Section/SectionView'
import ProductView from '../pages/Gallery/Product/ProductView'

const AppRouter = () => {
    return (
        <Routes>
            <Route path='/' element={<Home />} />
            <Route path='/login' element={<Login />} />
            <Route path='/about-us' element={<About />} />
            <Route path='/contact-us' element={<Contact />} />
            <Route path='/:sectionName' element={<SectionView /> } />
            <Route path='/:sectionName/:subsectionName' element={<ProductView /> } />
            {/* <Route path='/about' element={<About />} />  */}
        </Routes>
    )
}

export default AppRouter