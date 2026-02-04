import { TemplateGallery } from '@/components/whatsapp-flow/TemplateGallery'

export const metadata = {
  title: 'Templates - WhatsApp Studio - FlowCube',
  description: 'Browse WhatsApp chatbot templates',
}

export default function TemplatesPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <TemplateGallery />
    </div>
  )
}
