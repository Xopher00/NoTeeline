import ReactDOM from 'react-dom/client'
import { ChakraProvider, extendTheme } from '@chakra-ui/react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import App from './App.tsx'
import Home from './Home.tsx'

import './index.css'

const theme = extendTheme({
  styles: {
    global: () => ({
      body: {
        bg: "",
        padding: 0,
      }
    })
  }
})

const router = createBrowserRouter([
  {
    path: '/',
    element: <Home />,
    errorElement: <div>404 Not Found</div>,
  },
  {
    path: '/note',
    element: <App />,
    errorElement: <div>404 Not Found</div>,
  }
])

ReactDOM.createRoot(document.getElementById('root')!).render(
    <ChakraProvider theme={theme}>
      <RouterProvider router={router} />
    </ChakraProvider>
)
