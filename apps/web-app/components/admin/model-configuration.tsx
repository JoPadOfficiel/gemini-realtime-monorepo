'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Settings, Users, Bot, CheckCircle, AlertTriangle, Save, RefreshCw } from 'lucide-react';

interface Model {
  id: string;
  name: string;
  type: string;
  recommended: boolean;
  limits: string;
  warning?: string;
  enabled: boolean;
}

interface UserModelAccess {
  user_id: string;
  model_id: string;
  enabled: boolean;
  is_default: boolean;
}

interface User {
  id: string;
  name: string;
  email: string;
}

export function ModelConfiguration() {
  const [models, setModels] = useState<Model[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [userModelAccess, setUserModelAccess] = useState<UserModelAccess[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    loadModels();
    loadUsers();
  }, []);

  const loadModels = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_GEMINI_BACKEND_URL || 'http://localhost:8000'}/api/admin/models`);
      if (response.ok) {
        const data = await response.json();
        setModels(data.models || []);
      } else {
        throw new Error('Failed to load models');
      }
    } catch (error) {
      console.error('Error loading models:', error);
      setError('Failed to load models');
    }
  };

  const loadUsers = async () => {
    try {
      // Mock users for now - in real implementation, this would come from your user API
      setUsers([
        { id: 'user1', name: 'John Doe', email: 'john@example.com' },
        { id: 'user2', name: 'Jane Smith', email: 'jane@example.com' },
        { id: 'admin', name: 'Admin User', email: 'admin@example.com' }
      ]);
    } catch (error) {
      console.error('Error loading users:', error);
      setError('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserModelAccess = async (userId: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_GEMINI_BACKEND_URL || 'http://localhost:8000'}/api/admin/users/${userId}/models`);
      if (response.ok) {
        const data = await response.json();
        setUserModelAccess(data.model_access || []);
      } else {
        throw new Error('Failed to load user model access');
      }
    } catch (error) {
      console.error('Error loading user model access:', error);
      setError('Failed to load user model access');
    }
  };

  const updateModelConfig = async (model: Model) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_GEMINI_BACKEND_URL || 'http://localhost:8000'}/api/admin/models`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(model),
      });

      if (response.ok) {
        setSuccess('Model configuration updated successfully');
        loadModels();
      } else {
        throw new Error('Failed to update model configuration');
      }
    } catch (error) {
      console.error('Error updating model:', error);
      setError('Failed to update model configuration');
    }
  };

  const updateUserModelAccess = async () => {
    if (!selectedUser) return;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_GEMINI_BACKEND_URL || 'http://localhost:8000'}/api/admin/users/${selectedUser}/models`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userModelAccess),
      });

      if (response.ok) {
        setSuccess('User model access updated successfully');
      } else {
        throw new Error('Failed to update user model access');
      }
    } catch (error) {
      console.error('Error updating user model access:', error);
      setError('Failed to update user model access');
    }
  };

  const toggleModelEnabled = (modelId: string, enabled: boolean) => {
    const updatedModel = models.find(m => m.id === modelId);
    if (updatedModel) {
      updateModelConfig({ ...updatedModel, enabled });
    }
  };

  const toggleUserModelAccess = (modelId: string, enabled: boolean) => {
    setUserModelAccess(prev => 
      prev.map(access => 
        access.model_id === modelId 
          ? { ...access, enabled }
          : access
      )
    );
  };

  const setDefaultModel = (modelId: string) => {
    setUserModelAccess(prev => 
      prev.map(access => ({
        ...access,
        is_default: access.model_id === modelId
      }))
    );
  };

  useEffect(() => {
    if (selectedUser) {
      loadUserModelAccess(selectedUser);
    }
  }, [selectedUser]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex h-64 items-center justify-center">
          <RefreshCw className="size-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="size-4" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="size-5" />
            Model Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="global" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="global">Global Models</TabsTrigger>
              <TabsTrigger value="users">User Access</TabsTrigger>
            </TabsList>

            <TabsContent value="global" className="space-y-4">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Available Models</h3>
                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {models.map((model) => (
                      <Card key={model.id}>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{model.name}</h4>
                                {model.recommended && (
                                  <Badge variant="default">Recommended</Badge>
                                )}
                                {model.warning && (
                                  <Badge variant="destructive">Warning</Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {model.limits}
                              </p>
                              {model.warning && (
                                <p className="text-sm text-red-600">
                                  ⚠️ {model.warning}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center space-x-2">
                              <Label htmlFor={`model-${model.id}`}>Enabled</Label>
                              <Switch
                                id={`model-${model.id}`}
                                checked={model.enabled}
                                onCheckedChange={(checked) => 
                                  toggleModelEnabled(model.id, checked)
                                }
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </TabsContent>

            <TabsContent value="users" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Label htmlFor="user-select">Select User:</Label>
                  <Select value={selectedUser} onValueChange={setSelectedUser}>
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Choose a user" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedUser && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Model Access for {users.find(u => u.id === selectedUser)?.name}</h3>
                      <Button onClick={updateUserModelAccess}>
                        <Save className="mr-2 size-4" />
                        Save Changes
                      </Button>
                    </div>

                    <ScrollArea className="h-96">
                      <div className="space-y-4">
                        {userModelAccess.map((access) => {
                          const model = models.find(m => m.id === access.model_id);
                          if (!model) return null;

                          return (
                            <Card key={access.model_id}>
                              <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                      <h4 className="font-medium">{model.name}</h4>
                                      {access.is_default && (
                                        <Badge variant="outline">Default</Badge>
                                      )}
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                      {model.limits}
                                    </p>
                                  </div>
                                  <div className="flex items-center space-x-4">
                                    <div className="flex items-center space-x-2">
                                      <Label htmlFor={`access-${access.model_id}`}>Access</Label>
                                      <Switch
                                        id={`access-${access.model_id}`}
                                        checked={access.enabled}
                                        onCheckedChange={(checked) => 
                                          toggleUserModelAccess(access.model_id, checked)
                                        }
                                      />
                                    </div>
                                    {access.enabled && (
                                      <Button
                                        variant={access.is_default ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setDefaultModel(access.model_id)}
                                      >
                                        {access.is_default ? "Default" : "Set Default"}
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
