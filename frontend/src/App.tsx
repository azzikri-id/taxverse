import { BrowserRouter, Link, Route, Routes } from 'react-router'

import { Layout } from './components/Layout.tsx'
import { Beranda } from './pages/Beranda.tsx'
import { Bayar } from './pages/Bayar.tsx'
import { CekPlat } from './pages/CekPlat.tsx'
import { Faucet } from './pages/Faucet.tsx'
import { Petugas } from './pages/Petugas.tsx'
import { Saya } from './pages/Saya.tsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Beranda />} />
          <Route path="cek/:plat" element={<CekPlat />} />
          <Route path="bayar/:plat" element={<Bayar />} />
          <Route path="saya" element={<Saya />} />
          <Route path="faucet" element={<Faucet />} />
          <Route path="petugas" element={<Petugas />} />
          <Route path="*" element={<TidakDitemukan />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

function TidakDitemukan() {
  return (
    <div className="pt-20 text-center">
      <h1 className="text-3xl font-bold">Halaman tidak ditemukan</h1>
      <Link to="/" className="mt-4 inline-block text-indigo-300 underline underline-offset-2">
        Kembali ke beranda
      </Link>
    </div>
  )
}
