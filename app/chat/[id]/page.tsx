import ChatInterface from "@/components/ChatInterface"

interface ChatPageProps {
  params: { id: string }
}

export default function ChatPage({ params }: ChatPageProps) {
  return <ChatInterface chatId={params.id} />
}
