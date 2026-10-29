
import { useEffect, useState } from 'react';
import {
  Cloud,
  LayoutDashboard,
  Folder,
  Clock3,
  Share2,
  Search,
  Plus,
  UploadCloud,
  FileText,
  FileImage,
  FileSpreadsheet,
  MoreHorizontal,
  ChevronRight,
  HardDrive,
  Menu,
  X,
  Download,
  Trash2,
  LogOut,
  RotateCcw,
} from 'lucide-react';

import {
  authAPI,
  filesAPI,
  foldersAPI,
  sharesAPI,
} from './api';

import './App.css';

function App() {
  const [token, setToken] = useState(() =>
    localStorage.getItem('cloudnest_token')
  );

  const shareToken = window.location.pathname.match(/^\/share\/([^/]+)$/)?.[1];

  const [sharedFile, setSharedFile] = useState(null);
  const [shareError, setShareError] = useState('');
  const [shareLoading, setShareLoading] = useState(false);
  const [sharePassword, setSharePassword] = useState('');
  const [shareDownloading, setShareDownloading] = useState(false);

  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('login');

  const [authForm, setAuthForm] = useState({
    name: '',
    email: '',
    password: '',
  });

  const [active, setActive] = useState('Overview');
  const [search, setSearch] = useState('');
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [shares, setShares] = useState([]);
  const [trash, setTrash] = useState([]);

  const [currentFolderId, setCurrentFolderId] = useState('root');
  const [folderStack, setFolderStack] = useState([]);
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);

  const notify = (message) => setNotice(message);

  // Load public shared-file information.
  useEffect(() => {
    if (!shareToken) return;

    let cancelled = false;

    async function loadSharedFile() {
      setShareLoading(true);
      setShareError('');

      try {
        const result = await sharesAPI.info(shareToken);

        if (!cancelled) {
          setSharedFile(result.share || result);
        }
      } catch (error) {
        if (!cancelled) {
          setShareError(
            error.message || 'This share link is invalid or expired.'
          );
        }
      } finally {
        if (!cancelled) setShareLoading(false);
      }
    }

    loadSharedFile();

    return () => {
      cancelled = true;
    };
  }, [shareToken]);

  async function loadDashboard() {
    if (!token) return;

    setLoading(true);

    try {
      const me = await authAPI.me(token);
      setUser(me.user || me);

      if (active === 'Trash') {
        const result = await filesAPI.trash(token);

        setTrash(result.files || []);
        setFiles([]);
        setFolders([]);
        setShares([]);
      } else if (active === 'Shared') {
        const result = await sharesAPI.list(token);

        setShares(result.shares || []);
        setFiles([]);
        setFolders([]);
      } else {
        const [fileResult, folderResult] = await Promise.all([
          filesAPI.list(token, currentFolderId),
          foldersAPI.list(token, currentFolderId),
        ]);

        setFiles(fileResult.files || []);
        setFolders(folderResult.folders || []);
        setShares([]);
      }
    } catch (error) {
      if (/token|authorization|expired/i.test(error.message)) {
        logout();
      } else {
        notify(error.message || 'Unable to load your files.');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, active, currentFolderId]);

  async function handleAuth(event) {
    event.preventDefault();
    setBusy(true);

    try {
      const result =
        authMode === 'login'
          ? await authAPI.login({
              email: authForm.email,
              password: authForm.password,
            })
          : await authAPI.register(authForm);

      if (!result.token) {
        throw new Error('Authentication succeeded without a token.');
      }

      localStorage.setItem('cloudnest_token', result.token);

      setUser(result.user || null);
      setToken(result.token);
      setActive('Overview');
      setCurrentFolderId('root');
      setFolderStack([]);

      notify('Welcome to CloudNest!');
    } catch (error) {
      notify(error.message || 'Authentication failed.');
    } finally {
      setBusy(false);
    }
  }

  function logout() {
    localStorage.removeItem('cloudnest_token');

    setToken(null);
    setUser(null);
    setFiles([]);
    setFolders([]);
    setShares([]);
    setTrash([]);
    setCurrentFolderId('root');
    setFolderStack([]);
    setNotice('You have been signed out.');
  }

  async function uploadFiles(event) {
    const selected = Array.from(event.target.files || []);
    event.target.value = '';

    if (!selected.length) return;

    setBusy(true);
    let successful = 0;

    try {
      for (const file of selected) {
        notify(`Uploading ${file.name}...`);

        try {
          await filesAPI.upload(token, file, currentFolderId);
          successful += 1;
        } catch (error) {
          notify(`${file.name}: ${error.message}`);
        }
      }

      await loadDashboard();

      if (successful) {
        notify(`${successful} file(s) uploaded successfully.`);
      }
    } finally {
      setBusy(false);
    }
  }

  async function createFolder() {
    const name = window.prompt('Enter the new folder name:');

    if (!name?.trim()) return;

    try {
      await foldersAPI.create(token, name.trim(), currentFolderId);
      await loadDashboard();
      notify('Folder created successfully.');
    } catch (error) {
      notify(error.message);
    }
  }

  async function renameFile(file) {
    const name = window.prompt('Enter the new file name:', file.originalName);

    if (!name?.trim() || name.trim() === file.originalName) return;

    try {
      await filesAPI.rename(token, file._id, name.trim());
      await loadDashboard();
      notify('File renamed successfully.');
    } catch (error) {
      notify(error.message);
    }
  }

  async function renameFolder(folder) {
    const name = window.prompt('Enter the new folder name:', folder.name);

    if (!name?.trim() || name.trim() === folder.name) return;

    try {
      await foldersAPI.rename(token, folder._id, name.trim());
      await loadDashboard();
      notify('Folder renamed successfully.');
    } catch (error) {
      notify(error.message);
    }
  }

  async function deleteFile(file) {
    if (!window.confirm(`Move "${file.originalName}" to Trash?`)) return;

    try {
      await filesAPI.delete(token, file._id);
      await loadDashboard();
      notify('File moved to Trash.');
    } catch (error) {
      notify(error.message);
    }
  }

  async function deleteFolder(folder) {
    if (!window.confirm(`Delete folder "${folder.name}"?`)) return;

    try {
      await foldersAPI.delete(token, folder._id);
      await loadDashboard();
      notify('Folder deleted.');
    } catch (error) {
      notify(error.message);
    }
  }

  async function restoreFile(file) {
    try {
      await filesAPI.restore(token, file._id);
      await loadDashboard();
      notify('File restored successfully.');
    } catch (error) {
      notify(error.message);
    }
  }

  async function openStoredFile(file, preview = false) {
    try {
      const endpoint = preview
        ? filesAPI.previewUrl(file._id)
        : filesAPI.downloadUrl(file._id);

      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        let message = 'Unable to open this file.';

        try {
          const data = await response.json();
          message = data.message || message;
        } catch {
          // The server may return a non-JSON error.
        }

        throw new Error(message);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      if (preview) {
        const newWindow = window.open(url, '_blank');

        if (!newWindow) {
          const link = document.createElement('a');
          link.href = url;
          link.download = file.originalName;
          link.click();
        }

        setTimeout(() => URL.revokeObjectURL(url), 60000);
      } else {
        const link = document.createElement('a');
        link.href = url;
        link.download = file.originalName;

        document.body.appendChild(link);
        link.click();
        link.remove();

        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch (error) {
      notify(error.message);
    }
  }

  async function createShare(file) {
    const hoursInput = window.prompt(
      'Link expiry in hours (1–168):',
      '24'
    );

    if (hoursInput === null) return;

    const hours = Number(hoursInput);

    if (!Number.isInteger(hours) || hours < 1 || hours > 168) {
      notify('Expiry must be between 1 and 168 hours.');
      return;
    }

    const password = window.prompt(
      'Optional password (leave blank for no password):'
    );

    if (password === null) return;

    if (password && password.length < 8) {
      notify('Share password must contain at least 8 characters.');
      return;
    }

    try {
      const result = await sharesAPI.create(
        token,
        file._id,
        hours,
        password || undefined
      );

      const url = result.share.url;
      const savedLinks = JSON.parse(
        localStorage.getItem('cloudnestShareLinks') || '{}'
      );
      savedLinks[result.share.id] = url;
      localStorage.setItem(
        'cloudnestShareLinks',
        JSON.stringify(savedLinks)
      );
      try {
        await navigator.clipboard.writeText(url);
        notify(`Share link copied: ${url}`);
      } catch {
        window.prompt('Copy your share link using Ctrl+C:', url);
      }

      await loadDashboard();
    } catch (error) {
      notify(error.message);
    }
  }

  // Download a public share.
  // This assumes the backend accepts the password as a query parameter.
  async function downloadSharedFile(event) {
    event.preventDefault();
    setShareError('');
    setShareDownloading(true);

    try {
      const url = new URL(
        `/api/shares/${encodeURIComponent(shareToken)}/download`,
        'http://localhost:5000'
      );

      if (sharePassword.trim()) {
        url.searchParams.set('password', sharePassword);
      }

      const response = await fetch(url.toString());

      if (!response.ok) {
        let message = 'Unable to download this shared file.';

        try {
          const data = await response.json();
          message = data.message || message;
        } catch {
          // Response may not be JSON.
        }

        throw new Error(message);
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = objectUrl;
      link.download =
        sharedFile.file?.originalName ||
        sharedFile.originalName ||
        'shared-file';

      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (error) {
      setShareError(error.message || 'Download failed.');
    } finally {
      setShareDownloading(false);
    }
  }

  async function revokeShare(share) {
    if (!window.confirm('Revoke this share link?')) return;

    try {
      await sharesAPI.revoke(token, share.id);
      await loadDashboard();
      notify('Share link revoked.');
    } catch (error) {
      notify(error.message);
    }
  }


function navigate(label) {
  setActive(label);
  setMobileMenu(false);
  setSearch('');

  if (label === 'Overview' || label === 'My Files' || label === 'Workspace') {
    setCurrentFolderId('root');
    setFolderStack([]);
    setActive('My Files');
  }
}


  function openFolder(folder) {
    setFolderStack((stack) => [
      ...stack,
      { id: currentFolderId, name: folder.name },
    ]);

    setCurrentFolderId(folder._id);
    setActive('My Files');
    setSearch('');
  }

  function goBackFolder() {
    if (!folderStack.length) return;

    const stack = [...folderStack];
    const previous = stack.pop();

    setFolderStack(stack);
    setCurrentFolderId(previous.id);
    setActive('My Files');
  }

  const visibleFiles = files.filter((file) =>
    (file.originalName || '').toLowerCase().includes(search.toLowerCase())
  );

  const navItems = [
    { label: 'Overview', icon: LayoutDashboard },
    { label: 'My Files', icon: Folder },
    { label: 'Recent', icon: Clock3 },
    { label: 'Shared', icon: Share2 },
    { label: 'Trash', icon: Trash2 },
  ];

  const formatSize = (bytes = 0) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const formatDate = (date) =>
    date ? new Date(date).toLocaleDateString() : '—';

  const fileType = (file) => {
    const mime = file.mimeType || '';

    if (mime.startsWith('image/')) return 'image';
    if (mime.includes('spreadsheet') || mime.includes('csv')) return 'sheet';

    return 'pdf';
  };

  const fileIcon = (type) => {
    if (type === 'image') return <FileImage size={20} />;
    if (type === 'sheet') return <FileSpreadsheet size={20} />;

    return <FileText size={20} />;
  };

  // Public shared-file page.
  if (shareToken) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          padding: 20,
          background: '#f5f5fb',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <div
          style={{
            background: '#fff',
            padding: 32,
            borderRadius: 16,
            width: '100%',
            maxWidth: 440,
            boxSizing: 'border-box',
            boxShadow: '0 8px 35px #00000010',
          }}
        >
          <h1><Cloud size={28} /> CloudNest</h1>
<h2>Shared file</h2>

{shareLoading && <p>Loading shared file...</p>}

{shareError && (
  <p role="alert" style={{ color: '#c62828' }}>
    {shareError}
  </p>
)}

{sharedFile && (
  <>
    <p>
      <strong>
        {sharedFile.file?.originalName ||
          sharedFile.originalName ||
          'Shared file'}
      </strong>
    </p>
              <p>This file was shared with you securely.</p>

              {sharedFile.passwordProtected && (
                <form onSubmit={downloadSharedFile}>
                  <label
                    htmlFor="share-password"
                    style={{ display: 'block', marginBottom: 8 }}
                  >
                    Enter the share password
                  </label>

                  <input
                    id="share-password"
                    type="password"
                    required
                    autoComplete="current-password"
                    value={sharePassword}
                    onChange={(event) => setSharePassword(event.target.value)}
                    placeholder="Share password"
                    style={inputStyle}
                  />

                  <button
                    type="submit"
                    disabled={shareDownloading}
                    style={primaryStyle}
                  >
                    {shareDownloading ? 'Downloading...' : 'Download file'}
                  </button>
                </form>
              )}

              {!sharedFile.passwordProtected && (
                <button
                  onClick={downloadSharedFile}
                  disabled={shareDownloading}
                  style={primaryStyle}
                >
                  {shareDownloading ? 'Downloading...' : 'Download file'}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          padding: 20,
          background: '#f5f5fb',
        }}
      >
        <form
          onSubmit={handleAuth}
          style={{
            width: '100%',
            maxWidth: 420,
            background: '#fff',
            padding: 32,
            borderRadius: 18,
            boxShadow: '0 8px 35px #00000010',
          }}
        >
          <h1 style={{ marginBottom: 8 }}>
            <Cloud size={28} /> CloudNest
          </h1>

          <p style={{ color: '#666', marginBottom: 24 }}>
            Your personal cloud drive
          </p>

          {authMode === 'register' && (
            <input
              required
              minLength={2}
              maxLength={60}
              placeholder="Full name"
              value={authForm.name}
              onChange={(event) =>
                setAuthForm({ ...authForm, name: event.target.value })
              }
              style={inputStyle}
            />
          )}

          <input
            required
            type="email"
            placeholder="Email address"
            value={authForm.email}
            onChange={(event) =>
              setAuthForm({ ...authForm, email: event.target.value })
            }
            style={inputStyle}
          />

          <input
            required
            type="password"
            minLength={8}
            placeholder="Password (at least 8 characters)"
            value={authForm.password}
            onChange={(event) =>
              setAuthForm({ ...authForm, password: event.target.value })
            }
            style={inputStyle}
          />

          <button disabled={busy} type="submit" style={primaryStyle}>
            {busy
              ? 'Please wait...'
              : authMode === 'login'
                ? 'Log in'
                : 'Create account'}
          </button>

          <p style={{ marginTop: 18, textAlign: 'center' }}>
            {authMode === 'login'
              ? 'New to CloudNest? '
              : 'Already registered? '}

            <button
              type="button"
              onClick={() => {
                setAuthMode(authMode === 'login' ? 'register' : 'login');
                setNotice('');
              }}
              style={{
                border: 0,
                background: 'none',
                color: '#6c63ff',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              {authMode === 'login' ? 'Create account' : 'Log in'}
            </button>
          </p>

          {notice && <p role="alert">{notice}</p>}
        </form>
      </div>
    );
  }

  return (
    <div className="app-shell">
      {mobileMenu && (
        <button
          className="mobile-backdrop"
          aria-label="Close menu"
          onClick={() => setMobileMenu(false)}
        />
      )}

      <aside className={`sidebar ${mobileMenu ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark"><Cloud size={24} /></div>
          <span>cloud<span className="brand-light">nest</span></span>

          <button
            className="mobile-close"
            onClick={() => setMobileMenu(false)}
          >
            <X size={20} />
          </button>
        </div>

        <div className="workspace-label">WORKSPACE</div>

        <div className="workspace-switch">
          <div className="workspace-avatar">
            {(user?.name || 'C').charAt(0).toUpperCase()}
          </div>

          <div className="workspace-info">
            <strong>{user?.name || 'My workspace'}</strong>
            <span>{user?.email || 'Personal workspace'}</span>
          </div>
        </div>

        <div className="nav-label">MENU</div>

        <nav className="navigation">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.label}
                onClick={() => navigate(item.label)}
                className={`nav-item ${
                  active === item.label ? 'nav-active' : ''
                }`}
              >
                <Icon size={19} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-storage">
          <div className="storage-icon"><HardDrive size={18} /></div>

          <div className="storage-heading">
            <strong>Storage</strong>
            <span>100 MB limit</span>
          </div>

          <p>Storage is limited to 100 MB per account.</p>
        </div>

        <button className="settings-link" onClick={logout}>
          <LogOut size={19} /> Sign out
        </button>

        <div className="profile">
          <div className="profile-avatar">
            {(user?.name || 'C').charAt(0).toUpperCase()}
          </div>

          <div className="profile-info">
            <strong>{user?.name || 'CloudNest user'}</strong>
            <span>Personal account</span>
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button
            className="menu-toggle"
            onClick={() => setMobileMenu(true)}
          >
            <Menu size={22} />
          </button>
<div className="breadcrumbs">
  <button
    type="button"
    className="breadcrumb-button"
    onClick={() => navigate('Overview')}
  >
    Workspace
  </button>

  <ChevronRight size={15} />

  <button
    type="button"
    className="breadcrumb-button breadcrumb-current"
    onClick={() => navigate(active)}
  >
    {active}
  </button>
</div>



          <div className="topbar-actions">
            <label className="search-box">
              <Search size={18} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search your files..."
              />
            </label>

            <div className="top-avatar">
              {(user?.name || 'C').charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <div className="page-content">
          <section className="welcome-row">
            <div>
              <div className="eyebrow">YOUR PERSONAL CLOUD</div>

              <h1>
                {active === 'Overview'
                  ? `Welcome, ${(user?.name || 'there').split(' ')[0]}`
                  : active}
              </h1>

              <p>Manage your files securely in one place.</p>

              {folderStack.length > 0 && (
                <button className="text-button" onClick={goBackFolder}>
                  ← Back to parent folder
                </button>
              )}
            </div>

            <div className="welcome-actions">
              <button
                className="button-secondary"
                onClick={createFolder}
                disabled={busy}
              >
                <Plus size={17} /> New folder
              </button>

              <button
                className="button-primary"
                onClick={() => document.getElementById('file-upload').click()}
                disabled={busy}
              >
                <UploadCloud size={18} /> Upload files
              </button>

              <input
                id="file-upload"
                type="file"
                multiple
                hidden
                onChange={uploadFiles}
              />
            </div>
          </section>

          {notice && (
            <div className="notice" role="status">
              <span>{notice}</span>
              <button onClick={() => setNotice('')} aria-label="Dismiss">
                <X size={16} />
              </button>
            </div>
          )}

          {loading && <p>Loading your files...</p>}
          {busy && <p>Working... please wait.</p>}

          {active !== 'Trash' && active !== 'Shared' && (
            <section className="section-block">
              <div className="section-heading">
                <div>
                  <h2>Folders</h2>
                  <p>Your folders stored on the server</p>
                </div>
              </div>

              <div className="folder-grid">
                {folders.map((folder) => (
                  <div className="folder-card" key={folder._id}>
                    <button
                      onClick={() => openFolder(folder)}
                      style={{
                        border: 0,
                        background: 'transparent',
                        cursor: 'pointer',
                        textAlign: 'left',
                        width: '100%',
                      }}
                    >
                      <Folder size={25} />
                      <strong style={{ display: 'block', marginTop: 12 }}>
                        {folder.name}
                      </strong>
                      <span>Open folder</span>
                    </button>

                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                      <button onClick={() => renameFolder(folder)}>
                        Rename
                      </button>
                      <button onClick={() => deleteFolder(folder)}>
                        Delete
                      </button>
                    </div>
                  </div>
                ))}

                {!folders.length && !loading && (
                  <p>No folders yet. Select New folder to create one.</p>
                )}
              </div>
            </section>
          )}

          <section className="section-block files-section">
            <div className="section-heading">
              <div>
                <h2>
                  {active === 'Trash'
                    ? 'Trash'
                    : active === 'Shared'
                      ? 'Shared links'
                      : search
                        ? 'Search results'
                        : 'Your files'}
                </h2>

                <p>
                  {active === 'Trash'
                    ? 'Deleted files can be restored within 7 days.'
                    : active === 'Shared'
                      ? 'Manage your active and expired share links.'
                      : `${visibleFiles.length} file(s)`}
                </p>
              </div>
            </div>

            {active === 'Shared' ? (
              <div className="file-table-wrap">
                <table className="file-table">
                  <thead>
                    <tr>
                      <th>FILE</th>
                      <th>EXPIRES</th>
                      <th>DOWNLOADS</th>
                      <th>STATUS</th>
                      <th />
                    </tr>
                  </thead>

                  <tbody>
                    {shares.map((share) => (
                      <tr key={share.id}>
                        <td>
                          {share.file?.originalName || 'File unavailable'}
                          {share.passwordProtected && ' 🔒'}
                          </td>

                        <td>{formatDate(share.expiresAt)}</td>
                        <td>{share.downloadCount || 0}</td>

                        <td>
                          {share.revoked
                            ? 'Revoked'
                            : share.expired
                              ? 'Expired'
                              : 'Active'}
                        </td>

                        <td>
                          {!share.revoked && !share.expired && (
                            <button onClick={() => revokeShare(share)}>
                              Revoke
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}

                    {!shares.length && (
                      <tr><td colSpan="5">No share links yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="file-table-wrap">
                <table className="file-table">
                  <thead>
                    <tr>
                      <th>NAME</th>
                      <th>SIZE</th>
                      <th>MODIFIED</th>
                      <th>ACTIONS</th>
                    </tr>
                  </thead>

                  <tbody>
                    {(active === 'Trash' ? trash : visibleFiles).map((file) => {
                      const type = fileType(file);

                      return (
                        <tr key={file._id}>
                          <td>
                            <button
                              className="file-name"
                              onClick={() =>
                                active === 'Trash'
                                  ? restoreFile(file)
                                  : openStoredFile(file, true)
                              }
                            >
                              <span className="file-type-icon">
                                {fileIcon(type)}
                              </span>

                              <span>
                                <strong>{file.originalName}</strong>
                                <small>{file.mimeType || 'File'}</small>
                              </span>
                            </button>
                          </td>

                          <td className="file-size">{formatSize(file.size)}</td>

                          <td className="file-date">
                            {formatDate(file.updatedAt || file.createdAt)}
                          </td>

                          <td>
                            <div className="file-actions file-actions-visible">
                              {active === 'Trash' ? (
                                <button onClick={() => restoreFile(file)}>
                                  <RotateCcw size={16} />
                                  <span>Restore</span>
                                </button>
                              ) : (
                                <>
                                  <button onClick={() => openStoredFile(file, true)}>
                                    <FileText size={16} />
                                    <span>Preview</span>
                                  </button>

                                  <button onClick={() => openStoredFile(file)}>
                                    <Download size={16} />
                                    <span>Download</span>
                                  </button>

                                  <button onClick={() => createShare(file)}>
                                    <Share2 size={16} />
                                    <span>Share</span>
                                  </button>

                                  <button onClick={() => renameFile(file)}>
                                    <MoreHorizontal size={16} />
                                    <span>Rename</span>
                                  </button>

                                  <button onClick={() => deleteFile(file)}>
                                    <Trash2 size={16} />
                                    <span>Delete</span>
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {active !== 'Trash' && !visibleFiles.length && !loading && (
                      <tr>
                        <td colSpan="4" className="empty-state">
                          No files found. Upload a file to get started.
                        </td>
                      </tr>
                    )}

                    {active === 'Trash' && !trash.length && !loading && (
                      <tr>
                        <td colSpan="4" className="empty-state">
                          Your Trash is empty.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <footer className="page-footer">
            <span>© 2026 CloudNest</span>
            <span>Files stored securely on your server</span>
          </footer>
        </div>
      </main>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: 12,
  marginBottom: 14,
  border: '1px solid #ddd',
  borderRadius: 8,
  fontSize: 15,
};

const primaryStyle = {
  width: '100%',
  padding: 13,
  border: 0,
  borderRadius: 8,
  background: '#6c63ff',
  color: 'white',
  fontWeight: 600,
  cursor: 'pointer',
};

export default App;
