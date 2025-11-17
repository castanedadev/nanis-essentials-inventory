import React, { useState } from 'react';
import { Modal } from '../../molecules/Modal';
import { Button } from '../../atoms/Button';
import { DB, Branch } from '../../../types/models';
import { uid, nowIso } from '../../../lib/utils';

interface BranchManagerProps {
  db: DB;
  // eslint-disable-next-line no-unused-vars
  onSave: (branches: Branch[]) => void;
  onClose: () => void;
}

export function BranchManager({ db, onSave, onClose }: BranchManagerProps) {
  const [newBranchName, setNewBranchName] = useState('');
  const [branches, setBranches] = useState<Branch[]>(db.branches || []);

  const activeBranches = branches.filter(b => !b.closedAt);
  const closedBranches = branches.filter(b => b.closedAt);

  const handleCreateBranch = () => {
    const trimmedName = newBranchName.trim();
    if (!trimmedName) {
      alert('Please enter a branch name');
      return;
    }

    // Check for duplicate names (case-insensitive)
    const nameExists = branches.some(
      b => b.name.toLowerCase() === trimmedName.toLowerCase() && !b.closedAt
    );
    if (nameExists) {
      alert('A branch with this name already exists');
      return;
    }

    const newBranch: Branch = {
      id: uid(),
      name: trimmedName,
      createdAt: nowIso(),
    };

    setBranches([...branches, newBranch]);
    setNewBranchName('');
  };

  const handleCloseBranch = (branchId: string) => {
    if (
      !window.confirm(
        'Closing a branch will require moving all items back to main inventory. Continue?'
      )
    ) {
      return;
    }

    const updatedBranches = branches.map(b =>
      b.id === branchId ? { ...b, closedAt: nowIso() } : b
    );
    setBranches(updatedBranches);
  };

  const handleReopenBranch = (branchId: string) => {
    const updatedBranches = branches.map(b =>
      b.id === branchId ? { ...b, closedAt: undefined } : b
    );
    setBranches(updatedBranches);
  };

  const handleDeleteBranch = (branchId: string) => {
    const branch = branches.find(b => b.id === branchId);
    if (!branch) return;

    // Check if branch has any inventory items
    const hasItems = db.items.some(item => item.branchId === branchId);
    if (hasItems) {
      alert(
        'Cannot delete branch with inventory items. Please move all items back to main inventory first.'
      );
      return;
    }

    if (!window.confirm(`Delete branch "${branch.name}"? This action cannot be undone.`)) {
      return;
    }

    setBranches(branches.filter(b => b.id !== branchId));
  };

  const handleSave = () => {
    onSave(branches);
    onClose();
  };

  return (
    <Modal title="Manage Branches" onClose={onClose}>
      <div className="section-title">Create New Branch</div>
      <div className="grid two row-gap">
        <div>
          <label>Branch Name</label>
          <input
            type="text"
            value={newBranchName}
            onChange={e => setNewBranchName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleCreateBranch();
              }
            }}
            placeholder="Enter branch/store name"
          />
        </div>
        <div className="flex align-center">
          <Button onClick={handleCreateBranch} variant="primary">
            Create Branch
          </Button>
        </div>
      </div>

      {activeBranches.length > 0 && (
        <>
          <div className="section-title" style={{ marginTop: '2rem' }}>
            Active Branches
          </div>
          <div className="cards">
            {activeBranches.map(branch => (
              <div key={branch.id} className="card">
                <div className="flex space-between align-center">
                  <div>
                    <h4>{branch.name}</h4>
                    <p className="text-muted">
                      Created: {new Date(branch.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap">
                    <Button
                      variant="secondary"
                      onClick={() => handleCloseBranch(branch.id)}
                      title="Close branch"
                    >
                      Close
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => handleDeleteBranch(branch.id)}
                      title="Delete branch"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {closedBranches.length > 0 && (
        <>
          <div className="section-title" style={{ marginTop: '2rem' }}>
            Closed Branches
          </div>
          <div className="cards">
            {closedBranches.map(branch => (
              <div key={branch.id} className="card">
                <div className="flex space-between align-center">
                  <div>
                    <h4>{branch.name}</h4>
                    <p className="text-muted">
                      Closed:{' '}
                      {branch.closedAt ? new Date(branch.closedAt).toLocaleDateString() : ''}
                    </p>
                  </div>
                  <div className="flex gap">
                    <Button
                      variant="secondary"
                      onClick={() => handleReopenBranch(branch.id)}
                      title="Reopen branch"
                    >
                      Reopen
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => handleDeleteBranch(branch.id)}
                      title="Delete branch"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {branches.length === 0 && (
        <div className="empty">
          <p>No branches created yet. Create your first branch above.</p>
        </div>
      )}

      <div className="row gap end" style={{ marginTop: '2rem' }}>
        <Button variant="primary" onClick={handleSave}>
          Save Changes
        </Button>
        <Button onClick={onClose}>Cancel</Button>
      </div>
    </Modal>
  );
}
