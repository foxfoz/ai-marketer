import AuthForm from '@/components/AuthForm'

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-sidebar px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-border p-8 shadow-sm">
          <AuthForm mode="register" />
        </div>
      </div>
    </div>
  )
}
