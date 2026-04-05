import ReactMarkdown from 'react-markdown'

export default function MarkdownPreview({ content, className = '' }) {
  return (
    <div className={`prose prose-invert max-w-none prose-p:my-2 prose-li:my-1 prose-headings:mb-2 prose-headings:mt-4 ${className}`}>
      <ReactMarkdown>{content || ''}</ReactMarkdown>
    </div>
  )
}
