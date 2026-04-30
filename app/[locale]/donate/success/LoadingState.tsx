import PageHeader from './PageHeader'

type LoadingStateProps = {
  title: string
  subtitle: string
  message: string
}

export default function LoadingState({ title, subtitle, message }: LoadingStateProps) {
  return (
    <>
      <PageHeader title={title} subtitle={subtitle} />
      <div className="py-12 text-center">
        <div className="relative inline-block">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-ukraine-blue-200 border-t-ukraine-blue-500"></div>
        </div>
        <p className="mt-4 text-gray-600">{message}</p>
      </div>
    </>
  )
}
