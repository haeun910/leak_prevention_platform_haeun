import { useEffect, useState } from 'react';
import { ClipboardList, KeyRound, Plus, Trash2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import {
  createExceptionKeyword,
  deleteExceptionKeyword,
  getExceptionKeywords,
  getExceptionRequests,
  updateExceptionKeyword,
} from '../services/dashboardApi';
import '../dashboard.css';

const initialForm = { keyword: '', category: 'general', description: '', enabled: true };

function ExceptionKeywordsPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [requestRows, setRequestRows] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([getExceptionKeywords(), getExceptionRequests()])
      .then(([keywordResult, requestResult]) => {
        setRows(keywordResult.data);
        setRequestRows(requestResult.data);
      })
      .catch((err) => setError(err.response?.data?.detail || '예외 키워드를 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await createExceptionKeyword(form);
      setForm(initialForm);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.response?.data?.detail || '예외 키워드를 등록하지 못했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (row) => {
    await updateExceptionKeyword(row.id, { enabled: !row.enabled });
    load();
  };

  const remove = async (id) => {
    await deleteExceptionKeyword(id);
    load();
  };

  const enabledCount = rows.filter((row) => row.enabled).length;
  const pendingCount = requestRows.filter((row) => row.status === 'pending').length;
  const formatDate = (value) => value ? value.slice(0, 10) : '-';

  return (
    <DashboardLayout
      title="예외 관리"
      description="마스킹 예외 요청을 처리하고 승인된 키워드 목록을 관리합니다."
    >
      {error && <div className="dashboard-state error">{error}</div>}
      <div className="exception-tabs">
        <button className="exception-tab" onClick={() => navigate('/dashboard/exceptions')}>
          <ClipboardList size={16} />
          예외 요청
          <span>{pendingCount}</span>
        </button>
        <button className="exception-tab active">
          <KeyRound size={16} />
          예외 키워드 목록
          <span>{enabledCount}</span>
        </button>
      </div>

      <article className="dashboard-card dashboard-card-large exception-management-card">
        <div className="dashboard-card-header dashboard-card-header-row keyword-card-header">
          <div>
            <h2>예외 키워드 목록</h2>
            <p>총 {enabledCount}개 등록됨 · 활성 키워드는 마스킹에서 제외됩니다.</p>
          </div>
          <button className="dashboard-primary-btn keyword-add-btn" type="button" onClick={() => setShowForm((value) => !value)}>
            {showForm ? <X size={16} /> : <Plus size={16} />}
            {showForm ? '닫기' : '키워드 추가'}
          </button>
        </div>

        {showForm && (
          <form className="dashboard-form keyword-create-form" onSubmit={handleSubmit}>
            <input value={form.keyword} onChange={(e) => setForm({ ...form, keyword: e.target.value })} placeholder="키워드" />
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              <option value="general">일반</option>
              <option value="service">서비스명</option>
              <option value="model">모델명</option>
              <option value="project">프로젝트명</option>
              <option value="organization">조직명</option>
            </select>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="설명" />
            <label className="dashboard-check-row">
              <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />
              활성화
            </label>
            <button className="dashboard-primary-btn" disabled={saving || !form.keyword.trim()}>{saving ? '등록 중' : '등록'}</button>
          </form>
        )}

        {loading ? <div className="dashboard-state">불러오는 중입니다.</div> : (
          <div className="keyword-list">
            {rows.map((row) => (
              <div className={`keyword-row ${row.enabled ? '' : 'disabled'}`} key={row.id}>
                <div className="keyword-main">
                  <span className="keyword-pill">{row.keyword}</span>
                  <span className="keyword-category">{row.category}</span>
                  <span className="keyword-description">{row.description || '설명 없음'}</span>
                </div>
                <div className="keyword-row-actions">
                  <button className={`keyword-toggle ${row.enabled ? 'active' : ''}`} type="button" onClick={() => toggle(row)}>
                    {row.enabled ? '활성' : '비활성'}
                  </button>
                  <span className="keyword-date">{formatDate(row.created_at)}</span>
                  <button className="keyword-delete" type="button" onClick={() => remove(row.id)} aria-label="키워드 삭제">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
            {rows.length === 0 && <div className="dashboard-state">등록된 예외 키워드가 없습니다.</div>}
          </div>
        )}
      </article>
    </DashboardLayout>
  );
}

export default ExceptionKeywordsPage;
