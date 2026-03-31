import React from "react";
import { db } from "../lib/db";
import type { Category, Transaction } from "../lib/types";

type ExportData = {
  version: number;
  exportedAt: string;
  categories: Category[];
  transactions: Transaction[];
};

type ImportMode = "replace" | "merge";

export default function ImportExportPage({
  onRefresh,
  toast,
}: {
  onRefresh: () => Promise<void>;
  toast: (msg: string, kind?: "success" | "error" | "info") => void;
}) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [importing, setImporting] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);
  const [preview, setPreview] = React.useState<ExportData | null>(null);
  const [importMode, setImportMode] = React.useState<ImportMode>("merge");
  const [dragOver, setDragOver] = React.useState(false);

  /* ── Export ── */
  async function handleExport() {
    setExporting(true);
    try {
      const categories = await db.categories.toArray();
      const transactions = await db.transactions.toArray();

      const data: ExportData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        categories,
        transactions,
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const now = new Date();
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      a.download = `financeiro-casal-backup-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast("Backup exportado com sucesso!", "success");
    } catch (e: any) {
      toast(e?.message ?? "Erro ao exportar.", "error");
    } finally {
      setExporting(false);
    }
  }

  /* ── Read file ── */
  function readFile(file: File) {
    if (!file.name.endsWith(".json")) {
      toast("Selecione um arquivo .json válido.", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const raw = JSON.parse(ev.target?.result as string);
        if (!raw.categories || !raw.transactions) {
          toast("Arquivo inválido — campos 'categories' e 'transactions' são obrigatórios.", "error");
          return;
        }
        setPreview(raw as ExportData);
      } catch {
        toast("Arquivo JSON inválido.", "error");
      }
    };
    reader.readAsText(file);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) readFile(file);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) readFile(file);
  }

  /* ── Import ── */
  async function handleImport() {
    if (!preview) return;
    setImporting(true);

    try {
      if (importMode === "replace") {
        await db.transaction("rw", db.categories, db.transactions, async () => {
          await db.categories.clear();
          await db.transactions.clear();
          await db.categories.bulkAdd(preview.categories);
          await db.transactions.bulkAdd(preview.transactions);
        });
      } else {
        // Merge: add non-existing items, update existing by id
        await db.transaction("rw", db.categories, db.transactions, async () => {
          for (const cat of preview.categories) {
            await db.categories.put(cat);
          }
          for (const tx of preview.transactions) {
            await db.transactions.put(tx);
          }
        });
      }

      await onRefresh();
      setPreview(null);
      toast(
        importMode === "replace"
          ? "Dados substituídos com sucesso!"
          : "Dados mesclados com sucesso!",
        "success"
      );
    } catch (e: any) {
      toast(e?.message ?? "Erro ao importar.", "error");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="import-export-page">
      {/* Header */}
      <div className="ie-header">
        <div className="ie-header-icon">
          <i className="fa-solid fa-arrow-right-arrow-left" />
        </div>
        <div>
          <h2 className="ie-title">Importar & Exportar</h2>
          <p className="ie-subtitle">
            Faça backup dos seus dados ou restaure a partir de um arquivo anteriormente exportado.
          </p>
        </div>
      </div>

      <div className="ie-grid">
        {/* ── Export Card ── */}
        <div className="ie-card ie-card-export">
          <div className="ie-card-icon-row">
            <div className="ie-card-icon export-icon">
              <i className="fa-solid fa-cloud-arrow-down" />
            </div>
          </div>
          <h3 className="ie-card-title">Exportar Dados</h3>
          <p className="ie-card-desc">
            Gera um arquivo <code>.json</code> com todas as suas categorias e lançamentos.
            Guarde-o em local seguro como backup.
          </p>

          <ul className="ie-feature-list">
            <li>
              <i className="fa-solid fa-check" />
              Todas as categorias (ativas e arquivadas)
            </li>
            <li>
              <i className="fa-solid fa-check" />
              Todos os lançamentos de todos os meses
            </li>
            <li>
              <i className="fa-solid fa-check" />
              Compatível para restauração futura
            </li>
          </ul>

          <button
            className="ie-action-btn ie-export-btn"
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? (
              <>
                <i className="fa-solid fa-spinner fa-spin" />
                Exportando…
              </>
            ) : (
              <>
                <i className="fa-solid fa-download" />
                Baixar Backup
              </>
            )}
          </button>
        </div>

        {/* ── Import Card ── */}
        <div className="ie-card ie-card-import">
          <div className="ie-card-icon-row">
            <div className="ie-card-icon import-icon">
              <i className="fa-solid fa-cloud-arrow-up" />
            </div>
          </div>
          <h3 className="ie-card-title">Importar Dados</h3>
          <p className="ie-card-desc">
            Restaure seus dados a partir de um arquivo de backup <code>.json</code> exportado anteriormente.
          </p>

          {/* Drop zone */}
          <div
            className={`ie-dropzone ${dragOver ? "drag-over" : ""}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
            <i className="fa-solid fa-file-arrow-up ie-dropzone-icon" />
            <span className="ie-dropzone-text">
              Arraste o arquivo aqui ou <strong>clique para selecionar</strong>
            </span>
            <span className="ie-dropzone-hint">Somente arquivos .json</span>
          </div>

          {/* Preview */}
          {preview && (
            <div className="ie-preview">
              <div className="ie-preview-header">
                <i className="fa-solid fa-file-lines" />
                <span>Arquivo carregado</span>
              </div>

              <div className="ie-preview-stats">
                <div className="ie-stat">
                  <span className="ie-stat-value">{preview.categories.length}</span>
                  <span className="ie-stat-label">Categorias</span>
                </div>
                <div className="ie-stat">
                  <span className="ie-stat-value">{preview.transactions.length}</span>
                  <span className="ie-stat-label">Lançamentos</span>
                </div>
                {preview.exportedAt && (
                  <div className="ie-stat">
                    <span className="ie-stat-value" style={{ fontSize: 14 }}>
                      {new Date(preview.exportedAt).toLocaleDateString("pt-BR")}
                    </span>
                    <span className="ie-stat-label">Data do Backup</span>
                  </div>
                )}
              </div>

              {/* Mode selector */}
              <div className="ie-mode-selector">
                <label className="ie-mode-label">Modo de importação:</label>
                <div className="ie-mode-options">
                  <button
                    className={`ie-mode-btn ${importMode === "merge" ? "active" : ""}`}
                    onClick={() => setImportMode("merge")}
                  >
                    <i className="fa-solid fa-code-merge" />
                    Mesclar
                    <span className="ie-mode-hint">Mantém dados existentes e adiciona novos</span>
                  </button>
                  <button
                    className={`ie-mode-btn ${importMode === "replace" ? "active" : ""}`}
                    onClick={() => setImportMode("replace")}
                  >
                    <i className="fa-solid fa-arrows-rotate" />
                    Substituir
                    <span className="ie-mode-hint ie-mode-hint-danger">
                      Apaga todos os dados atuais
                    </span>
                  </button>
                </div>
              </div>

              {importMode === "replace" && (
                <div className="ie-warning">
                  <i className="fa-solid fa-triangle-exclamation" />
                  <span>
                    Atenção: isso <strong>apagará todos os dados atuais</strong> e os substituirá pelo conteúdo do arquivo. Essa ação não pode ser desfeita.
                  </span>
                </div>
              )}

              <div className="ie-preview-actions">
                <button
                  className="ie-action-btn ie-import-btn"
                  onClick={handleImport}
                  disabled={importing}
                >
                  {importing ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin" />
                      Importando…
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-upload" />
                      {importMode === "replace" ? "Substituir Dados" : "Mesclar Dados"}
                    </>
                  )}
                </button>
                <button
                  className="ie-cancel-btn"
                  onClick={() => setPreview(null)}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tips section */}
      <div className="ie-tips">
        <div className="ie-tips-icon">
          <i className="fa-solid fa-lightbulb" />
        </div>
        <div className="ie-tips-content">
          <h4>Dicas</h4>
          <ul>
            <li>Exporte regularmente para ter um backup seguro dos seus dados.</li>
            <li>Use <strong>"Mesclar"</strong> para adicionar dados sem perder os existentes.</li>
            <li>Use <strong>"Substituir"</strong> apenas quando quiser restaurar um backup completo.</li>
            <li>O arquivo exportado pode ser aberto em qualquer editor de texto para verificação.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
