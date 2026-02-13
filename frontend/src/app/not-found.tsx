export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <h2 className="text-2xl font-bold mb-4">Pagina nao encontrada</h2>
      <p className="text-muted-foreground mb-6">A pagina que voce procura nao existe ou foi movida.</p>
      <a href="/" className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
        Voltar ao inicio
      </a>
    </div>
  )
}
