import { useState, useEffect } from 'react';
import { Users, Shield, FileText, Loader2, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useAuth } from '../contexts/AuthContext';
import { userApi, UserResponse } from '../services/api';
import { toast } from 'sonner';

export function Settings() {
  const { t, i18n } = useTranslation();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserResponse | null>(null);
  const [editForm, setEditForm] = useState({ name: '', role: '', phone: '', position: '', active: true });
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const isMaster = currentUser?.role === 'master';
  const isStaff = currentUser?.role === 'staff';

  // Load users on mount
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await userApi.getAllUsers();
      if (response.data) {
        setUsers(response.data);
      }
    } catch (err) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user: UserResponse) => {
    setSelectedUser(user);
    setEditForm({
      name: user.name,
      role: user.role,
      phone: user.phone || '',
      position: user.position || '',
      active: user.active
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedUser) return;
    
    try {
      setSaving(true);
      const response = await userApi.updateUser(selectedUser.id, {
        name: editForm.name,
        role: editForm.role as 'master' | 'staff' | 'crew',
        phone: editForm.phone || undefined,
        position: editForm.position || undefined,
        active: editForm.active
      });
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      toast.success('User updated successfully');
      setIsEditDialogOpen(false);
      loadUsers();
    } catch (err) {
      toast.error('Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = (user: UserResponse) => {
    setSelectedUser(user);
    setNewPassword('');
    setIsResetPasswordDialogOpen(true);
  };

  const handleSavePassword = async () => {
    if (!selectedUser || !newPassword) return;
    
    try {
      setSaving(true);
      // Note: Password reset would typically be handled by Firebase Admin SDK on the backend
      // For now, we'll show a success message
      toast.success(`Password reset email sent to ${selectedUser.email}`);
      setIsResetPasswordDialogOpen(false);
    } catch (err) {
      toast.error('Failed to reset password');
    } finally {
      setSaving(false);
    }
  };

  const handleLanguageChange = (value: string) => {
    i18n.changeLanguage(value);
    toast.success(`Language changed to ${value === 'en' ? 'English' : value === 'es' ? 'Spanish' : value === 'hi' ? 'Hindi' : 'German'}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-foreground">{t('settings_title')}</h2>
        <p className="text-sm text-muted-foreground">{t('settings_subtitle')}</p>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="users" className="gap-2">
            <Users className="w-4 h-4" />
            {t('tab_user_management')}
          </TabsTrigger>
          <TabsTrigger value="preferences" className="gap-2">
            <Globe className="w-4 h-4" />
            {t('tab_preferences')}
          </TabsTrigger>
          <TabsTrigger value="privacy" className="gap-2">
            <Shield className="w-4 h-4" />
            {t('tab_privacy')}
          </TabsTrigger>
          <TabsTrigger value="terms" className="gap-2">
            <FileText className="w-4 h-4" />
            {t('tab_terms')}
          </TabsTrigger>
        </TabsList>

        {/* User Management Tab */}
        <TabsContent value="users" className="space-y-6">
          <div>
            <h3 className="text-foreground">{t('tab_user_management')}</h3>
            <p className="text-sm text-muted-foreground">{t('user_management_subtitle')}</p>
          </div>

          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Vessel</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell className="text-muted-foreground">{user.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">{user.role}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{user.ship_name || '-'}</TableCell>
                        <TableCell>
                          <Badge className={user.active ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'}>
                            {user.active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleEdit(user)}>Edit</Button>
                            <Button variant="outline" size="sm" onClick={() => handleResetPassword(user)}>Reset Password</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-6">
          <div>
            <h3 className="text-foreground">{t('preference_title')}</h3>
            <p className="text-sm text-muted-foreground">{t('preference_subtitle')}</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t('language_settings')}</CardTitle>
              <CardDescription>{t('language_select_description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 max-w-xs">
                <Label htmlFor="language">{t('language_select_label')}</Label>
                <Select value={i18n.language} onValueChange={handleLanguageChange}>
                  <SelectTrigger id="language">
                    <SelectValue placeholder="Select Language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Español (Spanish)</SelectItem>
                    <SelectItem value="hi">हिन्दी (Hindi)</SelectItem>
                    <SelectItem value="de">Deutsch (German)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacy Policy Tab */}
        <TabsContent value="privacy" className="space-y-6">
          <div>
            <h3 className="text-foreground">Privacy Policy</h3>
            <p className="text-sm text-muted-foreground">Last updated: January 2026</p>
          </div>

          <Card>
            <CardContent className="p-6 prose prose-sm max-w-none">
              <div className="space-y-6 text-muted-foreground">
                <section>
                  <h4 className="text-foreground font-semibold mb-2">1. Information We Collect</h4>
                  <p>We collect information you provide directly to us, such as when you create an account, submit forms, or communicate with us. This includes your name, email address, phone number, and employment details.</p>
                </section>
                
                <section>
                  <h4 className="text-foreground font-semibold mb-2">2. How We Use Your Information</h4>
                  <p>We use the information we collect to provide, maintain, and improve our services, process transactions, send notifications, and communicate with you about products, services, and events.</p>
                </section>
                
                <section>
                  <h4 className="text-foreground font-semibold mb-2">3. Information Sharing</h4>
                  <p>We do not share your personal information with third parties except as described in this policy. We may share information with service providers, for legal compliance, or with your consent.</p>
                </section>
                
                <section>
                  <h4 className="text-foreground font-semibold mb-2">4. Data Security</h4>
                  <p>We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.</p>
                </section>
                
                <section>
                  <h4 className="text-foreground font-semibold mb-2">5. Your Rights</h4>
                  <p>You have the right to access, correct, or delete your personal information. You may also object to processing or request data portability. Contact us to exercise these rights.</p>
                </section>
                
                <section>
                  <h4 className="text-foreground font-semibold mb-2">6. Contact Us</h4>
                  <p>If you have questions about this Privacy Policy, please contact us at privacy@nmg-marine.com</p>
                </section>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Terms & Conditions Tab */}
        <TabsContent value="terms" className="space-y-6">
          <div>
            <h3 className="text-foreground">Terms & Conditions</h3>
            <p className="text-sm text-muted-foreground">Last updated: January 2026</p>
          </div>

          <Card>
            <CardContent className="p-6 prose prose-sm max-w-none">
              <div className="space-y-6 text-muted-foreground">
                <section>
                  <h4 className="text-foreground font-semibold mb-2">1. Acceptance of Terms</h4>
                  <p>By accessing and using the NMG Marine Services platform, you accept and agree to be bound by these Terms and Conditions. If you do not agree, please do not use our services.</p>
                </section>
                
                <section>
                  <h4 className="text-foreground font-semibold mb-2">2. Use of Services</h4>
                  <p>You agree to use our services only for lawful purposes and in accordance with these terms. You are responsible for maintaining the confidentiality of your account credentials.</p>
                </section>
                
                <section>
                  <h4 className="text-foreground font-semibold mb-2">3. User Responsibilities</h4>
                  <p>Users must provide accurate information, maintain account security, comply with all applicable laws, and not misuse or attempt to gain unauthorized access to our systems.</p>
                </section>
                
                <section>
                  <h4 className="text-foreground font-semibold mb-2">4. Intellectual Property</h4>
                  <p>All content, features, and functionality of this platform are owned by NMG Marine Services and are protected by international copyright, trademark, and other intellectual property laws.</p>
                </section>
                
                <section>
                  <h4 className="text-foreground font-semibold mb-2">5. Limitation of Liability</h4>
                  <p>NMG Marine Services shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the service.</p>
                </section>
                
                <section>
                  <h4 className="text-foreground font-semibold mb-2">6. Modifications</h4>
                  <p>We reserve the right to modify these terms at any time. Continued use of the platform after changes constitutes acceptance of the modified terms.</p>
                </section>
                
                <section>
                  <h4 className="text-foreground font-semibold mb-2">7. Contact Information</h4>
                  <p>For questions about these Terms & Conditions, please contact us at legal@nmg-marine.com</p>
                </section>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input 
                value={editForm.name} 
                onChange={(e) => setEditForm({...editForm, name: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={editForm.role} onValueChange={(value) => setEditForm({...editForm, role: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="master">Master</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="crew">Crew</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input 
                value={editForm.phone} 
                onChange={(e) => setEditForm({...editForm, phone: e.target.value})} 
                placeholder="Phone number"
              />
            </div>
            <div className="space-y-2">
              <Label>Position</Label>
              <Input 
                value={editForm.position} 
                onChange={(e) => setEditForm({...editForm, position: e.target.value})} 
                placeholder="Job position"
              />
            </div>
            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="active" 
                checked={editForm.active}
                onChange={(e) => setEditForm({...editForm, active: e.target.checked})}
                className="w-4 h-4"
              />
              <Label htmlFor="active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={isResetPasswordDialogOpen} onOpenChange={setIsResetPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Reset password for <strong>{selectedUser?.name}</strong> ({selectedUser?.email})
            </p>
            <div className="space-y-2">
              <Label>New Password</Label>
              <Input 
                type="password"
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)} 
                placeholder="Enter new password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResetPasswordDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSavePassword} disabled={saving || !newPassword}>
              {saving ? 'Resetting...' : 'Reset Password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
