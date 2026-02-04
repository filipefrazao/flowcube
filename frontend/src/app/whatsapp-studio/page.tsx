import { WhatsAppFlowBuilder } from '@/components/whatsapp-flow/WhatsAppFlowBuilder'

export const metadata = {
  title: 'WhatsApp Studio - FlowCube',
  description: 'Create WhatsApp chatbot flows with visual editor',
}

export default function WhatsAppStudioPage() {
  return (
    <div className="h-screen w-full">
      <WhatsAppFlowBuilder />
    </div>
  )
}
