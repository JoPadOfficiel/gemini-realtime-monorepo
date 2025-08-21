'use client';

import { useState } from 'react';
import { UserRole } from '@prisma/client';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Shield, ShieldCheck } from 'lucide-react';

interface UserRoleManagerProps {
  userId: string;
  currentRole: UserRole;
  userName: string;
  userEmail: string;
  onRoleChanged?: () => void;
  disabled?: boolean;
}

export function UserRoleManager({
  userId,
  currentRole,
  userName,
  userEmail,
  onRoleChanged,
  disabled = false
}: UserRoleManagerProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole>(currentRole);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const roles = Object.values(UserRole);
  const hasChanges = selectedRole !== currentRole;

  const handleRoleChange = async () => {
    if (!hasChanges) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: selectedRole }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update user role');
      }

      toast.success(`User role updated to ${selectedRole}`);
      onRoleChanged?.();
      setShowConfirmDialog(false);
    } catch (error) {
      console.error('Error updating user role:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update user role');
      // Reset to current role on error
      setSelectedRole(currentRole);
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleIcon = (role: UserRole) => {
    return role === 'ADMIN' ? (
      <ShieldCheck className="h-4 w-4" />
    ) : (
      <Shield className="h-4 w-4" />
    );
  };

  const getRoleBadgeVariant = (role: UserRole) => {
    return role === 'ADMIN' ? 'default' : 'secondary';
  };

  return (
    <div className="flex items-center gap-2">
      <Badge variant={getRoleBadgeVariant(currentRole)} className="flex items-center gap-1">
        {getRoleIcon(currentRole)}
        {currentRole}
      </Badge>
      
      {!disabled && (
        <>
          <Select
            value={selectedRole}
            onValueChange={(value: UserRole) => setSelectedRole(value)}
            disabled={isLoading}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {roles.map((role) => (
                <SelectItem key={role} value={role}>
                  <div className="flex items-center gap-2">
                    {getRoleIcon(role)}
                    {role}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasChanges && (
            <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
              <AlertDialogTrigger asChild>
                <Button size="sm" disabled={isLoading}>
                  Update Role
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm Role Change</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to change <strong>{userName}</strong> ({userEmail}) 
                    from <strong>{currentRole}</strong> to <strong>{selectedRole}</strong>?
                    {selectedRole === 'USER' && currentRole === 'ADMIN' && (
                      <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800">
                        ⚠️ Warning: This will remove admin privileges from this user.
                      </div>
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setSelectedRole(currentRole)}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction onClick={handleRoleChange} disabled={isLoading}>
                    {isLoading ? 'Updating...' : 'Confirm Change'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </>
      )}
    </div>
  );
}
