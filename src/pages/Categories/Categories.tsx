import { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Tags } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { toast } from '../../components/ui/toastStore';
import { useDataStore } from '../../stores/dataStore';
import { categoryService } from '../../services/category.service';
import type { Category, CategoryInput } from '../../types';
import styles from './Categories.module.css';

const ICONS = [
  '🍔','🚗','🏠','🎮','💊','📚','🛍️','💸','💼','💻','📈','✈️','🎬','🍕',
  '☕','🚌','⛽','📱','🎁','🐶','💡','🏋️','🎵','📺','🛒','🏥','🎓','💳',
];

const COLORS = [
  '#FF6B6B','#FFA94D','#FCC419','#37B24D','#22B8CF','#4DABF7','#7048E8',
  '#9775FA','#E64980','#F783AC','#94a3b8','#0EA5E9','#84CC16','#F97316',
];

const EMPTY: CategoryInput = {
  name: '',
  icon: '🍔',
  color: '#6366f1',
  type: 'expense',
};

export function CategoriesPage() {
  const categories = useDataStore((s) => s.categories);
  const transactions = useDataStore((s) => s.transactions);
  const budgets = useDataStore((s) => s.budgets);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState<CategoryInput>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [removing, setRemoving] = useState(false);
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');

  const filtered = useMemo(() => {
    if (filter === 'all') return categories;
    return categories.filter((c) => c.type === filter);
  }, [categories, filter]);

  const grouped = useMemo(
    () => ({
      income: filtered.filter((c) => c.type === 'income'),
      expense: filtered.filter((c) => c.type === 'expense'),
    }),
    [filtered],
  );

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY);
    setModalOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setForm({ name: cat.name, icon: cat.icon, color: cat.color, type: cat.type });
    setModalOpen(true);
  };

  const requestDelete = (cat: Category) => {
    const linkedTx = transactions.filter((t) => t.categoryId === cat.id).length;
    const linkedBudgets = budgets.filter((b) => b.categoryId === cat.id).length;
    if (linkedTx > 0 || linkedBudgets > 0) {
      const parts: string[] = [];
      if (linkedTx > 0) parts.push(`${linkedTx} ${linkedTx === 1 ? 'transação' : 'transações'}`);
      if (linkedBudgets > 0) parts.push(`${linkedBudgets} ${linkedBudgets === 1 ? 'orçamento' : 'orçamentos'}`);
      toast.error(`"${cat.name}" está em uso (${parts.join(' e ')}). Remova ou reatribua antes de excluir.`);
      return;
    }
    setDeleting(cat);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Informe o nome da categoria');
    setSubmitting(true);
    try {
      if (editing) {
        await categoryService.update(editing.id, form);
        toast.success('Categoria atualizada');
      } else {
        await categoryService.create(form);
        toast.success('Categoria criada');
      }
      setModalOpen(false);
    } catch {
      toast.error('Não foi possível salvar');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setRemoving(true);
    try {
      await categoryService.remove(deleting.id);
      toast.success('Categoria removida');
      setDeleting(null);
    } catch {
      toast.error('Não foi possível remover');
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <h1 className={styles.title}>Categorias</h1>
          <p className={styles.subtitle}>Organize suas receitas e despesas em categorias.</p>
        </div>
        <Button leftIcon={<Plus size={16} />} onClick={openNew}>
          Nova categoria
        </Button>
      </header>

      <div className={styles.tabs}>
        {(['all', 'expense', 'income'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`${styles.tab} ${filter === t ? styles.tabActive : ''}`}
          >
            {t === 'all' ? 'Todas' : t === 'expense' ? 'Despesas' : 'Receitas'}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Tags size={28} />}
            title="Nenhuma categoria por aqui"
            description="Crie categorias para classificar suas transações."
            action={
              <Button leftIcon={<Plus size={16} />} onClick={openNew}>
                Nova categoria
              </Button>
            }
          />
        </Card>
      ) : (
        <div className={styles.groups}>
          {(filter === 'all' || filter === 'expense') && grouped.expense.length > 0 && (
            <CategoryGroup title="Despesas" tone="danger" items={grouped.expense} onEdit={openEdit} onDelete={requestDelete} />
          )}
          {(filter === 'all' || filter === 'income') && grouped.income.length > 0 && (
            <CategoryGroup title="Receitas" tone="success" items={grouped.income} onEdit={openEdit} onDelete={requestDelete} />
          )}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar categoria' : 'Nova categoria'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} loading={submitting}>
              Salvar
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className={styles.formStack}>
          <Input
            label="Nome"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Ex.: Mercado"
            autoFocus
          />
          <Select
            label="Tipo"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value as 'income' | 'expense' })}
          >
            <option value="expense">Despesa</option>
            <option value="income">Receita</option>
          </Select>

          <div>
            <label className={styles.fieldLabel}>Ícone</label>
            <div className={styles.iconGrid}>
              {ICONS.map((icon) => (
                <button
                  type="button"
                  key={icon}
                  onClick={() => setForm({ ...form, icon })}
                  className={`${styles.iconChip} ${form.icon === icon ? styles.iconChipActive : ''}`}
                >
                  <span>{icon}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={styles.fieldLabel}>Cor</label>
            <div className={styles.colorRow}>
              {COLORS.map((color) => (
                <button
                  type="button"
                  key={color}
                  aria-label={color}
                  onClick={() => setForm({ ...form, color })}
                  className={`${styles.colorChip} ${form.color === color ? styles.colorChipActive : ''}`}
                  style={{ background: color }}
                />
              ))}
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        title="Remover categoria"
        description={`Tem certeza que deseja remover "${deleting?.name}"?`}
        confirmLabel="Remover"
        destructive
        loading={removing}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}

interface GroupProps {
  title: string;
  tone: 'success' | 'danger';
  items: Category[];
  onEdit: (c: Category) => void;
  onDelete: (c: Category) => void;
}

function CategoryGroup({ title, tone, items, onEdit, onDelete }: GroupProps) {
  return (
    <Card title={<span className={styles.groupTitle}><Badge tone={tone}>{title}</Badge> <span>{items.length}</span></span>}>
      <div className={styles.list}>
        {items.map((cat) => (
          <div key={cat.id} className={styles.row} style={{ borderLeftColor: cat.color }}>
            <span className={styles.rowIcon} style={{ background: cat.color }}>
              {cat.icon}
            </span>
            <div className={styles.rowInfo}>
              <strong>{cat.name}</strong>
              <span>{cat.type === 'income' ? 'Receita' : 'Despesa'}</span>
            </div>
            <div className={styles.rowActions}>
              <button className={styles.iconBtn} onClick={() => onEdit(cat)} aria-label="Editar">
                <Pencil size={15} />
              </button>
              <button className={styles.iconBtn} onClick={() => onDelete(cat)} aria-label="Remover">
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
