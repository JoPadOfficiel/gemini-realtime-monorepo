'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Trash2, UserX, UserCheck, Eye, Users } from 'lucide-react';
import { toast } from 'sonner';
import UserDetailsModal from './user-details-modal';
import { UserRoleManager } from './user-role-manager';

const truncateEmail = (email: string, maxLength: number = 20) => {
  if (email.length <= maxLength) return email;
  const [localPart, domain] = email.split('@');
  if (!localPart || !domain) return email; // Safety check for invalid email format
  if (localPart.length > maxLength - 3) {
    return `${localPart.substring(0, maxLength - 3)}...@${domain}`;
  }
  return email;
};

interface User {
  id: string;
  name: string | null;
  email: string | null;
  role: 'USER' | 'ADMIN';
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  _count: {
    tokenUsages: number;
    userActivities: number;
  };
}

export default function UsersList() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      setUsers(data.users);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    setActionLoading(userId);
    try {
      const response = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (!response.ok) throw new Error('Failed to update user status');

      await fetchUsers();
      toast.success(`User ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      console.error('Error updating user status:', error);
      toast.error('Failed to update user status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setActionLoading(userId);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete user');

      await fetchUsers();
      toast.success('User deleted successfully');
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleViewDetails = (userId: string) => {
    setSelectedUserId(userId);
    setIsDetailsModalOpen(true);
  };

  const handleCloseDetailsModal = () => {
    setIsDetailsModalOpen(false);
    setSelectedUserId(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading users...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          User Management
          <Badge variant="secondary">{users.length} users</Badge>
        </CardTitle>
        <CardDescription>
          Manage all registered users, their status and activities.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-3 sm:p-6">
        {/* Responsive table container with horizontal scroll only when needed */}
        <div className="w-full overflow-x-auto">
          <div className="rounded-md border">
            <Table className="w-full">{/* Removed fixed min-width, let responsive classes handle it */}
            <TableHeader>
              <TableRow>
{/* Progressive responsive columns: Mobile(2) -> SM(3) -> MD(5) -> LG(6) -> XL(8) */}
                <TableHead className="w-auto">User</TableHead>
                <TableHead className="hidden sm:table-cell w-20">Status</TableHead>
                <TableHead className="hidden md:table-cell w-16">Role</TableHead>
                <TableHead className="hidden md:table-cell w-24 text-center">Tokens</TableHead>
                <TableHead className="hidden lg:table-cell w-20 text-center">Activities</TableHead>
                <TableHead className="hidden xl:table-cell w-28">Registration</TableHead>
                <TableHead className="hidden xl:table-cell w-28">Last Login</TableHead>
                <TableHead className="w-32 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <div className="font-medium">{user.name || 'No name'}</div>
                      <div className="text-sm text-muted-foreground break-all" title={user.email || ''}>
                        {user.email ? truncateEmail(user.email, 25) : 'No email'}
                      </div>
                    </div>
                  </TableCell>
{/* Status column - visible from SM up */}
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant={user.isActive ? 'default' : 'destructive'}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  {/* Role column - visible from MD up */}
                  <TableCell className="hidden md:table-cell">
                    <UserRoleManager
                      userId={user.id}
                      currentRole={user.role}
                      userName={user.name || 'Unknown'}
                      userEmail={user.email || 'No email'}
                      onRoleChanged={fetchUsers}
                      disabled={actionLoading === user.id}
                    />
                  </TableCell>
{/* Tokens Used column - visible from MD up */}
                  <TableCell className="hidden md:table-cell">
                    <div className="text-center">
                      <div className="font-semibold">{user._count.tokenUsages.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">tokens</div>
                    </div>
                  </TableCell>
                  {/* Activities column - visible from LG up */}
                  <TableCell className="hidden lg:table-cell">
                    <div className="text-center">
                      <div className="font-semibold">{user._count.userActivities.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">activities</div>
                    </div>
                  </TableCell>
{/* Registration column - visible from XL up */}
                  <TableCell className="text-sm hidden xl:table-cell">
                    {formatDate(user.createdAt)}
                  </TableCell>
                  {/* Last Login column - visible from XL up */}
                  <TableCell className="text-sm hidden xl:table-cell">
                    {user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Never'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1 flex-wrap">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetails(user.id)}
                        className="gap-1 min-w-[80px]"
                      >
                        <Eye className="h-3 w-3" />
                        <span className="hidden sm:inline">Details</span>
                        <span className="sm:hidden">View</span>
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleUserStatus(user.id, user.isActive)}
                        disabled={actionLoading === user.id}
                        className="gap-1 min-w-[90px]"
                      >
                        {user.isActive ? (
                          <>
                            <UserX className="h-3 w-3" />
                            <span className="hidden sm:inline">Deactivate</span>
                            <span className="sm:hidden">Disable</span>
                          </>
                        ) : (
                          <>
                            <UserCheck className="h-3 w-3" />
                            <span className="hidden sm:inline">Activate</span>
                            <span className="sm:hidden">Enable</span>
                          </>
                        )}
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={actionLoading === user.id}
                            className="gap-1 min-w-[80px]"
                          >
                            <Trash2 className="h-3 w-3" />
                            <span className="hidden sm:inline">Delete</span>
                            <span className="sm:hidden">Del</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete user <strong>{user.email}</strong>?
                              This action is irreversible and will delete all associated data.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteUser(user.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete Permanently
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </div>

        {users.length === 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No users found.</p>
          </div>
        )}
      </CardContent>

      <UserDetailsModal
        userId={selectedUserId}
        isOpen={isDetailsModalOpen}
        onClose={handleCloseDetailsModal}
      />
    </Card>
  );
}
