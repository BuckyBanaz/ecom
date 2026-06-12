import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IconPicker } from "@/components/admin/IconPicker";
import { Trash2, Plus, Loader2 } from "lucide-react";
import { cmsFeaturesRepository, adminSettingsRepository, authRepository } from "@/client/apiClient";
import { useAdmin } from "@/context/AdminContext";

const AdminSettings = () => {
  const { t } = useTranslation();
  const { user: adminUser, hasPermission } = useAdmin();
  const [isMounted, setIsMounted] = useState(false);
  const isSuperAdmin = hasPermission("settings");

  const queryTab = new URLSearchParams(window.location.search).get("tab") || (isSuperAdmin ? "features" : "profile");
  const [tab, setTab] = useState(!isSuperAdmin && queryTab !== "profile" ? "profile" : queryTab);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t) {
      if (!isSuperAdmin && t !== "profile") {
        setTab("profile");
      } else {
        setTab(t);
      }
    }
  }, [window.location.search, isSuperAdmin]);
  
  const [featureItems, setFeatureItems] = useState([
    { id: 1, icon: "truck-fast", title: "Fast delivery", description: "Order before 22:00, delivered next day" },
    { id: 2, icon: "arrow-rotate-left", title: "30-day returns", description: "Not happy? Send it back for free" },
    { id: 3, icon: "shield-check", title: "2-year warranty", description: "Quality you can trust" },
    { id: 4, icon: "headset", title: "Expert support", description: "7 days a week" },
  ]);

  const [isLoadingFeatures, setIsLoadingFeatures] = useState(true);

  const [smtpSettings, setSmtpSettings] = useState({
    host: "",
    port: "",
    encryption: "tls",
    username: "",
    password: "",
    fromName: "",
    fromEmail: "",
    enabled: true,
  });
  const [isLoadingSmtp, setIsLoadingSmtp] = useState(true);

  const [paymentSettings, setPaymentSettings] = useState({
    ideal: true,
    card: true,
    paypal: false,
    klarna: false,
    bancontact: false,
    stripePublishableKey: "",
    stripeSecretKey: "",
  });
  const [isLoadingPayments, setIsLoadingPayments] = useState(true);

  const [shippingSettings, setShippingSettings] = useState({
    freeShippingThreshold: 75,
    standardShippingFee: 5.95,
    expressShippingFee: 9.95,
    sameDayDelivery: true,
    deliveryCutoffTime: "22:00",
    sendcloudEnabled: true,
    sendcloudPublicKey: "",
    sendcloudSecretKey: "",
  });
  const [isLoadingShipping, setIsLoadingShipping] = useState(true);

  const [authSettings, setAuthSettings] = useState({
    emailLogin: true,
    phoneLogin: false,
    registerMethod: "both",
    smsProvider: "twilio",
    twilioAccountSid: "",
    twilioAuthToken: "",
    twilioSenderNumber: "",  });
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  const [generalSettings, setGeneralSettings] = useState({
    storeName: "",
    storeUrl: "",
    supportEmail: "",
    currency: "EUR",
    maintenanceMode: false,
    maintenanceMessage: "",
  });
  const [isLoadingGeneral, setIsLoadingGeneral] = useState(true);
  const [isSavingGeneral, setIsSavingGeneral] = useState(false);

  const [profileData, setProfileData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    role: "",
  });
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoadingProfile(true);
        const res = await authRepository.getProfile();
        if (res.success && res.data) {
          setProfileData({
            firstName: res.data.firstName || "",
            lastName: res.data.lastName || "",
            email: res.data.email || adminUser?.email || "",
            phone: res.data.phone || "",
            role: adminUser?.role || "admin",
          });
        }
      } catch (error) {
        console.error("Error fetching admin profile:", error);
      } finally {
        setIsLoadingProfile(false);
      }
    };
    if (tab === "profile") {
      fetchProfile();
    }
  }, [tab, adminUser]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingProfile(true);
      const res = await authRepository.updateProfile({
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        phone: profileData.phone,
      });
      if (res.success) {
        toast.success(t("admin_settings.profile_toast_success"));
        const saved = localStorage.getItem("admin_user");
        if (saved) {
          const parsed = JSON.parse(saved);
          parsed.name = `${profileData.firstName} ${profileData.lastName}`.trim();
          localStorage.setItem("admin_user", JSON.stringify(parsed));
        }
      } else {
        toast.error(t("admin_settings.profile_toast_error"));
      }
    } catch (error: any) {
      toast.error(error.message || t("admin_settings.profile_toast_error"));
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error(t("admin_settings.password_toast_mismatch"));
      return;
    }
    try {
      setIsUpdatingPassword(true);
      const res = await authRepository.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      if (res.success) {
        toast.success(t("admin_settings.password_toast_success"));
        setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        toast.error(t("admin_settings.password_toast_error"));
      }
    } catch (error: any) {
      toast.error(error.message || t("admin_settings.password_toast_error"));
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  useEffect(() => {
    if (!isSuperAdmin) return;
    const fetchFeatures = async () => {
      try {
        const res = await cmsFeaturesRepository.get();
        if (res.success && res.data && Array.isArray(res.data) && res.data.length > 0) {
          setFeatureItems(res.data);
        }
      } catch (error) {
        console.error("Error fetching features:", error);
      } finally {
        setIsLoadingFeatures(false);
      }
    };
    const fetchSmtpSettings = async () => {
      try {
        const res = await adminSettingsRepository.getSmtpSettings();
        if (res.success && res.data) {
          setSmtpSettings(res.data);
        }
      } catch (error) {
        console.error("Error fetching SMTP settings:", error);
      } finally {
        setIsLoadingSmtp(false);
      }
    };
    const fetchPaymentSettings = async () => {
      try {
        const res = await adminSettingsRepository.getPaymentSettings();
        if (res.success && res.data) {
          setPaymentSettings(res.data);
        }
      } catch (error) {
        console.error("Error fetching payment settings:", error);
      } finally {
        setIsLoadingPayments(false);
      }
    };
    const fetchShippingSettings = async () => {
      try {
        const res = await adminSettingsRepository.getShippingSettings();
        if (res.success && res.data) {
          setShippingSettings(res.data);
        }
      } catch (error) {
        console.error("Error fetching shipping settings:", error);
      } finally {
        setIsLoadingShipping(false);
      }
    };
    const fetchAuthSettings = async () => {
      try {
        const res = await adminSettingsRepository.getAuthSettings();
        if (res.success && res.data) {
          setAuthSettings(res.data);
        }
      } catch (error) {
        console.error("Error fetching auth settings:", error);
      } finally {
        setIsLoadingAuth(false);
      }
    };
    const fetchGeneralSettings = async () => {
      try {
        const res = await adminSettingsRepository.getGeneralSettings();
        if (res.success && res.data) {
          setGeneralSettings({
            storeName: res.data.storeName || "",
            storeUrl: res.data.storeUrl || "",
            supportEmail: res.data.supportEmail || "",
            currency: res.data.currency || "EUR",
            maintenanceMode: !!res.data.maintenanceMode,
            maintenanceMessage: res.data.maintenanceMessage || "",
          });
        }
      } catch (error) {
        console.error("Error fetching general settings:", error);
      } finally {
        setIsLoadingGeneral(false);
      }
    };
    fetchFeatures();
    fetchSmtpSettings();
    fetchPaymentSettings();
    fetchShippingSettings();
    fetchAuthSettings();
    fetchGeneralSettings();
  }, [isSuperAdmin]);  const handleSaveFeatures = async () => {
    try {
      const res = await cmsFeaturesRepository.update(featureItems);
      if (res.success) {
        toast.success("Features saved successfully");
      } else {
        toast.error("Failed to save features");
      }
    } catch (error) {
      toast.error("An error occurred while saving features");
    }
  };

  const handleSave = (section: string) => (e: React.FormEvent) => {
    e.preventDefault();
    toast.success(`${section} settings saved (demo)`);
  };

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingGeneral(true);
      const res = await adminSettingsRepository.updateGeneralSettings(generalSettings);
      if (res.success) {
        toast.success("General settings saved successfully");
      } else {
        toast.error(res.message || "Failed to save general settings");
      }
    } catch (error: any) {
      toast.error(error?.message || "An error occurred while saving general settings");
    } finally {
      setIsSavingGeneral(false);
    }
  };

  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await adminSettingsRepository.updateSmtpSettings(smtpSettings);
      if (res.success) {
        toast.success(t("admin_settings.smtp_toast_success"));
      } else {
        toast.error(t("admin_settings.smtp_toast_error"));
      }
    } catch (error) {
      toast.error("An error occurred while saving SMTP settings");
    }
  };

  const handleSavePayments = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await adminSettingsRepository.updatePaymentSettings(paymentSettings);
      if (res.success) {
        toast.success(t("admin_settings.payment_toast_success"));
      } else {
        toast.error(t("admin_settings.payment_toast_error"));
      }
    } catch (error) {
      toast.error("An error occurred while saving Payment settings");
    }
  };

  const handleSaveShipping = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await adminSettingsRepository.updateShippingSettings(shippingSettings);
      if (res.success) {
        toast.success(t("admin_settings.shipping_toast_success"));
      } else {
        toast.error(t("admin_settings.shipping_toast_error"));
      }
    } catch (error) {
      toast.error("An error occurred while saving Shipping settings");
    }
  };

  const handleSaveAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await adminSettingsRepository.updateAuthSettings(authSettings);
      if (res.success) {
        toast.success(t("admin_settings.auth_toast_success"));
      } else {
        toast.error(t("admin_settings.auth_toast_error"));
      }
    } catch (error) {
      toast.error("An error occurred while saving Auth settings");
    }
  };

  const handleSendTestEmail = async () => {
    const testEmail = window.prompt(t("admin_settings.smtp_test_prompt"));
    if (!testEmail) return;

    toast.promise(
      adminSettingsRepository.testSmtpSettings(testEmail),
      {
        loading: t("admin_settings.smtp_test_loading"),
        success: (res) => res.message || t("admin_settings.smtp_test_success", { email: testEmail }),
        error: (err) => err?.message || t("admin_settings.smtp_test_error"),
      }
    );
  };

  return (
    <div>

      <Tabs value={tab} onValueChange={setTab} className="mt-1">
        {/* Scrollable tabs on mobile */}
        <div className="overflow-x-auto pb-1">
          <TabsList className="flex min-w-max w-full sm:w-auto flex-nowrap">
            <TabsTrigger value="profile" className="text-xs sm:text-sm">{t("admin_settings.tab_profile")}</TabsTrigger>
            {isSuperAdmin && (
              <>
                <TabsTrigger value="general" className="text-xs sm:text-sm">{t("admin_settings.tab_general")}</TabsTrigger>
                <TabsTrigger value="features" className="text-xs sm:text-sm">{t("admin_settings.tab_features")}</TabsTrigger>
                <TabsTrigger value="smtp" className="text-xs sm:text-sm">{t("admin_settings.tab_smtp")}</TabsTrigger>
                <TabsTrigger value="auth" className="text-xs sm:text-sm">{t("admin_settings.tab_auth")}</TabsTrigger>
                <TabsTrigger value="payments" className="text-xs sm:text-sm">{t("admin_settings.tab_payments")}</TabsTrigger>
                <TabsTrigger value="shipping" className="text-xs sm:text-sm">{t("admin_settings.tab_shipping")}</TabsTrigger>
              </>
            )}
          </TabsList>
        </div>

        <TabsContent value="profile">
          <div className="mt-4 grid gap-6 md:grid-cols-2">
            {/* Profile Info Form */}
            {isLoadingProfile ? (
              <div className="flex justify-center p-8 border rounded-xl bg-card"><Loader2 className="animate-spin text-muted-foreground" /></div>
            ) : (
              <form onSubmit={handleSaveProfile} className="space-y-4 rounded-xl border bg-card p-4 sm:p-6 shadow-sm">
                <h3 className="font-semibold text-lg text-foreground">Profile Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label>First Name</Label>
                    <Input 
                      value={profileData.firstName} 
                      onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })} 
                      className="mt-1 bg-background" 
                    />
                  </div>
                  <div>
                    <Label>Last Name</Label>
                    <Input 
                      value={profileData.lastName} 
                      onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })} 
                      className="mt-1 bg-background" 
                    />
                  </div>
                </div>
                <div>
                  <Label>Email</Label>
                  <Input 
                    value={profileData.email} 
                    disabled 
                    className="mt-1 bg-muted cursor-not-allowed text-muted-foreground" 
                    title="Email cannot be changed" 
                  />
                </div>
                <div>
                  <Label>Phone Number</Label>
                  <Input 
                    value={profileData.phone} 
                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })} 
                    className="mt-1 bg-background" 
                  />
                </div>
                <div>
                  <Label>Role</Label>
                  <Input 
                    value={profileData.role.toUpperCase()} 
                    disabled 
                    className="mt-1 bg-muted cursor-not-allowed text-muted-foreground font-semibold" 
                    title="Role cannot be changed" 
                  />
                </div>
                <Button type="submit" disabled={isSavingProfile} className="rounded-full w-full sm:w-auto">
                  {isSavingProfile ? "Saving..." : "Save Profile"}
                </Button>
              </form>
            )}

            {/* Change Password Form */}
            <form onSubmit={handleUpdatePassword} className="space-y-4 rounded-xl border bg-card p-4 sm:p-6 shadow-sm">
              <h3 className="font-semibold text-lg text-foreground">{t("admin_settings.password_title")}</h3>
              <div>
                <Label>{t("admin_settings.password_label_current")}</Label>
                <Input 
                  type="password" 
                  value={passwordData.currentPassword} 
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })} 
                  className="mt-1 bg-background" 
                  required 
                />
              </div>
              <div>
                <Label>{t("admin_settings.password_label_new")}</Label>
                <Input 
                  type="password" 
                  value={passwordData.newPassword} 
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })} 
                  className="mt-1 bg-background" 
                  required 
                  minLength={6}
                />
              </div>
              <div>
                <Label>{t("admin_settings.password_label_confirm")}</Label>
                <Input 
                  type="password" 
                  value={passwordData.confirmPassword} 
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })} 
                  className="mt-1 bg-background" 
                  required 
                  minLength={6}
                />
              </div>
              <Button type="submit" disabled={isUpdatingPassword} className="rounded-full w-full sm:w-auto">
                {isUpdatingPassword ? t("admin_settings.password_button_updating") : t("admin_settings.password_button")}
              </Button>
            </form>
          </div>
        </TabsContent>

        <TabsContent value="general">
          <form onSubmit={handleSaveGeneral} className="mt-4 w-full max-w-xl space-y-4 rounded-xl border bg-card p-4 sm:p-6">
            {isLoadingGeneral ? (
              <div className="text-sm text-muted-foreground">Loading general settings...</div>
            ) : (
              <>
                <div>
                  <Label>Store Name</Label>
                  <Input
                    value={generalSettings.storeName}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, storeName: e.target.value })}
                    placeholder="SCHIP & STER"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Store URL</Label>
                  <Input
                    value={generalSettings.storeUrl}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, storeUrl: e.target.value })}
                    placeholder="https://schipandster.nl"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Support Email</Label>
                  <Input
                    type="email"
                    value={generalSettings.supportEmail}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, supportEmail: e.target.value })}
                    placeholder="support@schipandster.nl"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Currency</Label>
                  {isMounted && (
                    <Select
                      value={generalSettings.currency}
                      onValueChange={(val) => setGeneralSettings({ ...generalSettings, currency: val })}
                    >
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="GBP">GBP (£)</SelectItem>
                        <SelectItem value="INR">INR (₹)</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="rounded-lg border bg-muted/40 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <Label className="text-base">Maintenance Mode</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        When enabled, only admins can access the website. All other visitors will see a maintenance page.
                      </p>
                    </div>
                    <Switch
                      checked={generalSettings.maintenanceMode}
                      onCheckedChange={(val) => setGeneralSettings({ ...generalSettings, maintenanceMode: val })}
                    />
                  </div>
                  {generalSettings.maintenanceMode && (
                    <div>
                      <Label className="text-sm">Maintenance Message</Label>
                      <Input
                        value={generalSettings.maintenanceMessage}
                        onChange={(e) => setGeneralSettings({ ...generalSettings, maintenanceMessage: e.target.value })}
                        placeholder="We're currently performing maintenance. We'll be back shortly!"
                        className="mt-1"
                      />
                    </div>
                  )}
                </div>
                <Button type="submit" disabled={isSavingGeneral} className="rounded-full w-full sm:w-auto">
                  {isSavingGeneral ? "Saving..." : "Save Changes"}
                </Button>
              </>
            )}
          </form>
        </TabsContent>

        <TabsContent value="features">
          <div className="mt-4 w-full space-y-4 rounded-xl border bg-card p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Features Items</h3>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setFeatureItems([...featureItems, { id: Date.now(), icon: "star", title: "", description: "" }])}
                className="gap-2"
              >
                <Plus size={16} /> Add Item
              </Button>
            </div>
            
            <div className="space-y-4">
              {/* Desktop header */}
              <div className="hidden sm:grid grid-cols-[1fr_2fr_3fr_auto] gap-4 mb-2 text-sm font-medium text-muted-foreground">
                <div>Icon</div>
                <div>Title</div>
                <div>Description</div>
                <div className="w-8"></div>
              </div>
              
              {featureItems.map((item, index) => (
                <div key={item.id} className="flex flex-col gap-2 rounded-lg border p-3 sm:p-0 sm:border-0 sm:rounded-none sm:grid sm:grid-cols-[1fr_2fr_3fr_auto] sm:gap-4 sm:items-start">
                  <IconPicker 
                    value={item.icon} 
                    onChange={(val) => {
                      const newItems = [...featureItems];
                      newItems[index].icon = val;
                      setFeatureItems(newItems);
                    }} 
                  />
                  <Input 
                    value={item.title} 
                    onChange={(e) => {
                      const newItems = [...featureItems];
                      newItems[index].title = e.target.value;
                      setFeatureItems(newItems);
                    }} 
                    placeholder="E.g. Fast delivery" 
                  />
                  <Input 
                    value={item.description} 
                    onChange={(e) => {
                      const newItems = [...featureItems];
                      newItems[index].description = e.target.value;
                      setFeatureItems(newItems);
                    }} 
                    placeholder="E.g. Order before 22:00..." 
                  />
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 self-end sm:self-auto"
                    onClick={() => setFeatureItems(featureItems.filter(i => i.id !== item.id))}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              ))}
            </div>
            
            <div className="pt-4 border-t mt-6">
              <Button onClick={handleSaveFeatures} className="rounded-full w-full sm:w-auto">
                Save Features
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="smtp">
          {isLoadingSmtp ? (
            <div className="flex justify-center p-8"><Loader2 className="animate-spin text-muted-foreground" /></div>
          ) : (
            <form onSubmit={handleSaveSmtp} className="mt-4 w-full max-w-xl space-y-4 rounded-xl border bg-card p-4 sm:p-6">
              <div><Label>SMTP Host</Label><Input value={smtpSettings.host} onChange={(e) => setSmtpSettings({...smtpSettings, host: e.target.value})} className="mt-1" /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><Label>Port</Label><Input value={smtpSettings.port} onChange={(e) => setSmtpSettings({...smtpSettings, port: e.target.value})} className="mt-1" /></div>
                <div><Label>Encryption</Label>
                  {isMounted && (
                    <Select value={smtpSettings.encryption} onValueChange={(v) => setSmtpSettings({...smtpSettings, encryption: v})}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="tls">TLS</SelectItem><SelectItem value="ssl">SSL</SelectItem><SelectItem value="none">None</SelectItem></SelectContent></Select>
                  )}
                </div>
              </div>
              <div><Label>Username</Label><Input value={smtpSettings.username} onChange={(e) => setSmtpSettings({...smtpSettings, username: e.target.value})} className="mt-1" /></div>
              <div><Label>Password</Label><Input type="password" value={smtpSettings.password} onChange={(e) => setSmtpSettings({...smtpSettings, password: e.target.value})} className="mt-1" /></div>
              <div><Label>From Name</Label><Input value={smtpSettings.fromName} onChange={(e) => setSmtpSettings({...smtpSettings, fromName: e.target.value})} className="mt-1" /></div>
              <div><Label>From Email</Label><Input value={smtpSettings.fromEmail} onChange={(e) => setSmtpSettings({...smtpSettings, fromEmail: e.target.value})} className="mt-1" /></div>
              <div className="flex items-center gap-2"><Switch checked={smtpSettings.enabled} onCheckedChange={(checked) => setSmtpSettings({...smtpSettings, enabled: checked})} /><Label>Enable Email Notifications</Label></div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button type="submit" className="rounded-full w-full sm:w-auto">Save SMTP</Button>
                <Button type="button" variant="outline" className="rounded-full w-full sm:w-auto" onClick={handleSendTestEmail}>Send Test Email</Button>
              </div>
            </form>
          )}
        </TabsContent>

        <TabsContent value="auth">
          {isLoadingAuth ? (
            <div className="flex justify-center p-8"><Loader2 className="animate-spin text-muted-foreground" /></div>
          ) : (
            <form onSubmit={handleSaveAuth} className="mt-4 w-full max-w-xl space-y-4 rounded-xl border bg-card p-4 sm:p-6">
              <h3 className="font-semibold text-lg">Login Methods</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div><p className="font-semibold">Email / Password</p><p className="text-xs text-muted-foreground">Standard email login</p></div>
                  <Switch checked={authSettings.emailLogin} onCheckedChange={c => setAuthSettings({...authSettings, emailLogin: c})} />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div><p className="font-semibold">Phone (SMS OTP)</p><p className="text-xs text-muted-foreground">Login via SMS code</p></div>
                  <Switch checked={authSettings.phoneLogin} onCheckedChange={c => setAuthSettings({...authSettings, phoneLogin: c})} />
                </div>
              </div>
              
              <h3 className="font-semibold text-lg mt-6">Registration Setting</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div><p className="font-semibold">Sign Up Method</p><p className="text-xs text-muted-foreground">What details are required at sign up?</p></div>
                  {isMounted && (
                    <Select value={authSettings.registerMethod} onValueChange={v => setAuthSettings({...authSettings, registerMethod: v})}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="both">Email & Phone</SelectItem>
                        <SelectItem value="email_only">Email Only</SelectItem>
                        <SelectItem value="phone_only">Phone Only</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
              
              <h3 className="font-semibold text-lg mt-6">Phone / SMS Settings</h3>
              <div><Label>SMS Provider</Label>
                {isMounted && (
                  <Select value={authSettings.smsProvider} onValueChange={v => setAuthSettings({...authSettings, smsProvider: v})}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="twilio">Twilio</SelectItem><SelectItem value="messagebird">MessageBird</SelectItem><SelectItem value="vonage">Vonage</SelectItem></SelectContent></Select>
                )}
              </div>
              
              {authSettings.smsProvider === "twilio" && (
                <>
                  <div><Label>Twilio Account SID</Label><Input value={authSettings.twilioAccountSid} onChange={e => setAuthSettings({...authSettings, twilioAccountSid: e.target.value})} className="mt-1" placeholder="Enter Account SID" /></div>
                  <div><Label>Twilio Auth Token</Label><Input type="password" value={authSettings.twilioAuthToken} onChange={e => setAuthSettings({...authSettings, twilioAuthToken: e.target.value})} className="mt-1" placeholder="Enter auth token" /></div>
                  <div><Label>Twilio Sender Phone Number</Label><Input value={authSettings.twilioSenderNumber} onChange={e => setAuthSettings({...authSettings, twilioSenderNumber: e.target.value})} className="mt-1" placeholder="+31612345678" /></div>
                </>
              )}
              
              <Button type="submit" className="rounded-full w-full sm:w-auto mt-4">Save Auth Settings</Button>
            </form>
          )}
        </TabsContent>

        <TabsContent value="payments">
          {isLoadingPayments ? (
            <div className="flex justify-center p-8"><Loader2 className="animate-spin text-muted-foreground" /></div>
          ) : (
            <form onSubmit={handleSavePayments} className="mt-4 w-full max-w-xl space-y-4 rounded-xl border bg-card p-4 sm:p-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div><p className="font-semibold">iDEAL</p><p className="text-xs text-muted-foreground">Dutch bank transfer</p></div>
                  <Switch checked={paymentSettings.ideal} onCheckedChange={(c) => setPaymentSettings({...paymentSettings, ideal: c})} />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div><p className="font-semibold">Credit Card</p><p className="text-xs text-muted-foreground">Visa, Mastercard, Amex</p></div>
                  <Switch checked={paymentSettings.card} onCheckedChange={(c) => setPaymentSettings({...paymentSettings, card: c})} />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div><p className="font-semibold">PayPal</p><p className="text-xs text-muted-foreground">PayPal checkout</p></div>
                  <Switch checked={paymentSettings.paypal} onCheckedChange={(c) => setPaymentSettings({...paymentSettings, paypal: c})} />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div><p className="font-semibold">Klarna</p><p className="text-xs text-muted-foreground">Buy now, pay later</p></div>
                  <Switch checked={paymentSettings.klarna} onCheckedChange={(c) => setPaymentSettings({...paymentSettings, klarna: c})} />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div><p className="font-semibold">Bancontact</p><p className="text-xs text-muted-foreground">Belgian payments</p></div>
                  <Switch checked={paymentSettings.bancontact} onCheckedChange={(c) => setPaymentSettings({...paymentSettings, bancontact: c})} />
                </div>
              </div>
              <div>
                <Label>Stripe Secret Key</Label>
                <Input 
                  type="password" 
                  value={paymentSettings.stripeSecretKey} 
                  onChange={(e) => setPaymentSettings({...paymentSettings, stripeSecretKey: e.target.value})} 
                  className="mt-1" 
                  placeholder="sk_live_..." 
                />
              </div>
              <div>
                <Label>Stripe Publishable Key</Label>
                <Input 
                  value={paymentSettings.stripePublishableKey} 
                  onChange={(e) => setPaymentSettings({...paymentSettings, stripePublishableKey: e.target.value})} 
                  className="mt-1" 
                  placeholder="pk_live_..." 
                />
              </div>
              <Button type="submit" className="rounded-full w-full sm:w-auto">Save Payment Settings</Button>
            </form>
          )}
        </TabsContent>

        <TabsContent value="shipping">
          {isLoadingShipping ? (
            <div className="flex justify-center p-8"><Loader2 className="animate-spin text-muted-foreground" /></div>
          ) : (
            <form onSubmit={handleSaveShipping} className="mt-4 w-full max-w-xl space-y-6 rounded-xl border bg-card p-4 sm:p-6">
              <div className="space-y-4">
                <div><Label>Free Shipping Threshold (€)</Label><Input type="number" value={shippingSettings.freeShippingThreshold} onChange={e => setShippingSettings({...shippingSettings, freeShippingThreshold: Number(e.target.value)})} className="mt-1" /></div>
                <div><Label>Standard Shipping Fee (€)</Label><Input type="number" step="0.01" value={shippingSettings.standardShippingFee} onChange={e => setShippingSettings({...shippingSettings, standardShippingFee: Number(e.target.value)})} className="mt-1" /></div>
                <div><Label>Express Shipping Fee (€)</Label><Input type="number" step="0.01" value={shippingSettings.expressShippingFee} onChange={e => setShippingSettings({...shippingSettings, expressShippingFee: Number(e.target.value)})} className="mt-1" /></div>
                <div className="flex items-center gap-2"><Switch checked={shippingSettings.sameDayDelivery} onCheckedChange={c => setShippingSettings({...shippingSettings, sameDayDelivery: c})} /><Label>Same-day delivery available</Label></div>
                <div><Label>Delivery Cutoff Time</Label><Input value={shippingSettings.deliveryCutoffTime} onChange={e => setShippingSettings({...shippingSettings, deliveryCutoffTime: e.target.value})} className="mt-1" /></div>
              </div>

              <div className="border-t pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">Sendcloud Integration</h3>
                    <p className="text-xs text-muted-foreground mt-1">Connect your Sendcloud account for automated label generation.</p>
                  </div>
                  <Switch checked={shippingSettings.sendcloudEnabled} onCheckedChange={c => setShippingSettings({...shippingSettings, sendcloudEnabled: c})} />
                </div>
                
                <div>
                  <Label>Public API Key</Label>
                  <Input value={shippingSettings.sendcloudPublicKey} onChange={e => setShippingSettings({...shippingSettings, sendcloudPublicKey: e.target.value})} placeholder="Enter Sendcloud Public Key" className="mt-1" />
                </div>
                
                <div>
                  <Label>Secret API Key</Label>
                  <Input type="password" value={shippingSettings.sendcloudSecretKey} onChange={e => setShippingSettings({...shippingSettings, sendcloudSecretKey: e.target.value})} placeholder="Enter Sendcloud Secret Key" className="mt-1" />
                </div>
              </div>

              <Button type="submit" className="rounded-full w-full sm:w-auto mt-4">Save Shipping Settings</Button>
            </form>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminSettings;