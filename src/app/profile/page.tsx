import Header from '@/components/Header'
import CompanyBriefForm from '@/components/CompanyBriefForm'

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-bg-sidebar">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl border border-border p-8 shadow-sm">
          <CompanyBriefForm />
        </div>
      </main>
    </div>
  )
}
