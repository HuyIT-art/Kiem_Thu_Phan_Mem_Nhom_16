// src/pages/OwnerLoginPage.jsx
import { useState, useEffect } from 'react'
import axios from 'axios'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import './Form.css' // Dùng chung file CSS

// API Đăng nhập của CHỦ HOMESTAY / ADMIN
const API_URL = 'http://localhost:3000/api/owner/login'

function OwnerLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()
  const location = useLocation()
  const isAdminLoginRoute = location.pathname.startsWith('/admin')

  useEffect(() => {
    const token = localStorage.getItem('ownerAuthToken')
    const ownerStr = localStorage.getItem('ownerAuthUser')
    if (token && ownerStr) {
      try {
        const owner = JSON.parse(ownerStr)
        if (owner?.Quyen === 'admin') {
          navigate('/admin/dashboard')
        } else if (!isAdminLoginRoute) {
          navigate('/owner/dashboard')
        }
      } catch {
        // ignore
      }
    }
  }, [navigate, isAdminLoginRoute])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await axios.post(API_URL, { 
        email: email.trim(), 
        password 
      })

      const { token, owner } = response.data.data

      if (isAdminLoginRoute && owner.Quyen !== 'admin') {
        const msg = 'Tài khoản này không có quyền Quản trị viên (Admin).'
        toast.error(msg)
        setError(msg)
        setLoading(false)
        return
      }

      // Lưu token của Owner/Admin vào key riêng
      localStorage.setItem('ownerAuthToken', token)
      localStorage.setItem('ownerAuthUser', JSON.stringify(owner))

      if (owner.Quyen === 'admin') {
        toast.success('Đăng nhập Quản trị viên (Admin) thành công!')
        setTimeout(() => {
          window.location.href = '/admin/dashboard'
        }, 400)
      } else {
        toast.success('Đăng nhập Chủ Homestay thành công!')
        setTimeout(() => {
          window.location.href = '/owner/dashboard'
        }, 400)
      }

    } catch (err) {
      const message = err.response?.data?.message || 'Đăng nhập thất bại.'
      toast.error(message)
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="form-container">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h2>{isAdminLoginRoute ? 'Đăng Nhập Quản Trị Viên (Admin)' : 'Đăng Nhập Kênh Chủ Nhà'}</h2>
        {error && <p className="error-message">{error}</p>}

        <div className="form-group">
          <label htmlFor="email">{isAdminLoginRoute ? 'Email Quản trị viên:' : 'Email (Chủ Homestay):'}</label>
          <input
            id="email"
            type="email"
            placeholder={isAdminLoginRoute ? 'admin@test.com' : 'seed.owner@test.com'}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Mật khẩu:</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Đang xử lý...' : 'Đăng Nhập'}
        </button>

        <div className="form-links">
          <Link to="/owner/forgot-password">Quên mật khẩu?</Link>
        </div>
      </form>
    </div>
  )
}

export default OwnerLoginPage
