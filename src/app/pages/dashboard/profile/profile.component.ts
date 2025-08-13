import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FirebaseUserService } from '../../../services/firebase-user.service';
import { AuthService } from '../../../services/auth.service';
import { UserProfile, UserPreferences, UserPrivacy } from '../../../models/user.interface';
import { Observable } from 'rxjs';
import { Storage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  profileForm!: FormGroup;
  userProfile: UserProfile | null = null;
  currentUserId: string | null = null;
  currentUser: any = null;
  isLoading = false;
  isUpdating = false;
  updateMessage = '';
  updateError = '';
  
  // Avatar upload properties
  selectedFile: File | null = null;
  previewUrl: string | null = null;
  isUploading = false;

  constructor(
    private fb: FormBuilder,
    private userService: FirebaseUserService,
    private authService: AuthService,
    private storage: Storage
  ) {
    this.initializeForms();
  }

  ngOnInit(): void {
    this.loadCurrentUser();
  }

  private initializeForms(): void {
    this.profileForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: [{value: '', disabled: true}],
      location: [''],
      bio: [''],
      avatar: ['']
    });
  }

  private loadCurrentUser(): void {
    this.isLoading = true;
    this.authService.currentUser$.subscribe({
      next: (user: any) => {
        if (user) {
          this.currentUserId = user.id;
          this.currentUser = user; // Store current user for fallback
          this.loadUserProfile(user.id);
        } else {
          this.isLoading = false;
        }
      },
      error: (error: any) => {
        console.error('Error getting current user:', error);
        this.isLoading = false;
      }
    });
  }

  private loadUserProfile(userId: string): void {
    this.userService.getUserProfile(userId).subscribe({
      next: (profile) => {
        if (profile) {
          this.userProfile = profile;
          this.populateForms(profile);
        } else if (this.currentUser) {
          // No Firestore profile exists, create one from Firebase Auth data
          this.userProfile = {
            id: this.currentUser.id,
            username: this.currentUser.username || this.currentUser.email?.split('@')[0] || 'User',
            email: this.currentUser.email || '',
            firstName: '',
            lastName: '',
            bio: '',
            location: '',
            avatar: '',
            displayName: this.currentUser.displayName || this.currentUser.username || '',
            joinedDate: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
            lastActiveAt: new Date(),
            isActive: true,
            isEmailVerified: this.currentUser.emailVerified || false,
            portfolioPublic: false,
            favoriteCoins: [],
            tradingExperience: 'beginner',
            portfolios: [],
            followersCount: 0,
            followingCount: 0,
            postsCount: 0,
            preferences: {
              theme: 'light',
              currency: 'USD',
              notifications: {
                email: true,
                portfolio: true,
                social: true
              }
            },
            privacy: {
              profileVisibility: 'public',
              portfolioVisibility: 'private',
              showHoldings: false
            }
          };
          this.populateForms(this.userProfile);
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading user profile:', error);
        // Fallback to auth data even on error
        if (this.currentUser) {
          this.userProfile = {
            id: this.currentUser.id,
            username: this.currentUser.username || this.currentUser.email?.split('@')[0] || 'User',
            email: this.currentUser.email || '',
            firstName: '',
            lastName: '',
            bio: '',
            location: '',
            avatar: '',
            displayName: this.currentUser.displayName || this.currentUser.username || '',
            joinedDate: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
            lastActiveAt: new Date(),
            isActive: true,
            isEmailVerified: this.currentUser.emailVerified || false,
            portfolioPublic: false,
            favoriteCoins: [],
            tradingExperience: 'beginner',
            portfolios: [],
            followersCount: 0,
            followingCount: 0,
            postsCount: 0,
            preferences: {
              theme: 'light',
              currency: 'USD',
              notifications: {
                email: true,
                portfolio: true,
                social: true
              }
            },
            privacy: {
              profileVisibility: 'public',
              portfolioVisibility: 'private',
              showHoldings: false
            }
          };
          this.populateForms(this.userProfile);
        }
        this.isLoading = false;
      }
    });
  }

  private populateForms(profile: UserProfile): void {
    // Populate profile form
    this.profileForm.patchValue({
      username: profile.username || '',
      email: profile.email || '',
      location: profile.location || '',
      bio: profile.bio || '',
      avatar: profile.avatar || ''
    });
  }

  onUpdateProfile(): void {
    if (this.profileForm.valid && this.currentUserId) {
      this.isUpdating = true;
      this.updateError = '';
      this.updateMessage = '';

      const profileData = this.profileForm.value;
      
      this.userService.updateUserProfile(this.currentUserId, profileData).subscribe({
        next: async () => {
          this.updateMessage = 'Profile updated successfully!';
          this.isUpdating = false;
          this.loadUserProfile(this.currentUserId!);
          await this.authService.refreshCurrentUser();
        },
        error: (error) => {
          console.error('Error updating profile:', error);
          this.updateError = 'Failed to update profile. Please try again.';
          this.isUpdating = false;
        }
      });
    }
  }



  clearMessages(): void {
    this.updateMessage = '';
    this.updateError = '';
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        this.updateError = 'Please select a valid image file.';
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.updateError = 'Image file must be less than 5MB.';
        return;
      }

      this.selectedFile = file;
      this.updateError = '';

      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.previewUrl = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  async uploadAvatar(): Promise<void> {
    if (!this.selectedFile || !this.currentUserId) {
      return;
    }

    this.isUploading = true;
    this.updateError = '';

    try {
      // Validate file type and size
      if (!this.selectedFile.type.startsWith('image/')) {
        throw new Error('Please select an image file');
      }
      
      if (this.selectedFile.size > 5 * 1024 * 1024) {
        throw new Error('File size must be less than 5MB');
      }

      // Create unique filename with timestamp
      const timestamp = Date.now();
      const fileExtension = this.selectedFile.name.split('.').pop()?.toLowerCase() || 'jpg';
      const filename = `avatars/${this.currentUserId}_${timestamp}.${fileExtension}`;
      

      
      // Create storage reference
      const storageRef = ref(this.storage, filename);
      
      // Upload file with metadata
      const metadata = {
        contentType: this.selectedFile.type,
        customMetadata: {
          'uploadedBy': this.currentUserId,
          'uploadedAt': new Date().toISOString()
        }
      };
      
      // Upload file
      const snapshot = await uploadBytes(storageRef, this.selectedFile, metadata);

      
      // Get download URL
      const downloadURL = await getDownloadURL(snapshot.ref);

      
      // Debug: Log current profile data before update

      
      // Update user profile with new avatar URL only (merge should preserve other fields)
      await this.userService.updateUserProfile(this.currentUserId, { avatar: downloadURL }).toPromise();
      
      // Debug: Verify what's in the database after update

      

      
      // Update the current userProfile object with new avatar
      if (this.userProfile) {
        this.userProfile.avatar = downloadURL;
      }
      
      // Update form with the new avatar URL only, preserving other fields
      this.profileForm.patchValue({ avatar: downloadURL });
      this.updateMessage = 'Avatar uploaded successfully!';
      
      // Refresh header to show new avatar immediately
      await this.authService.refreshCurrentUser();
      
      // Clear selected file and preview
      this.selectedFile = null;
      this.previewUrl = null;
      
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      
      // Provide more specific error messages
      if (error.code === 'storage/unauthorized') {
        this.updateError = 'Upload failed: Please check Firebase Storage permissions';
      } else if (error.code === 'storage/unknown') {
        this.updateError = 'Upload failed: Check Firebase Storage rules and CORS configuration';
      } else if (error.message) {
        this.updateError = error.message;
      } else {
        this.updateError = 'Failed to upload avatar. Please try again.';
      }
    } finally {
      this.isUploading = false;
    }
  }

  removeAvatar(): void {
    if (this.currentUserId) {
      this.isUpdating = true;
      this.updateError = '';
      
      this.userService.updateUserProfile(this.currentUserId, { avatar: '' }).subscribe({
        next: async () => {

          
          this.profileForm.patchValue({ avatar: '' });
          this.updateMessage = 'Avatar removed successfully!';
          this.isUpdating = false;
          this.loadUserProfile(this.currentUserId!);
        },
        error: (error) => {
          console.error('Error removing avatar:', error);
          this.updateError = 'Failed to remove avatar. Please try again.';
          this.isUpdating = false;
        }
      });
    }
  }

  cancelUpload(): void {
    this.selectedFile = null;
    this.previewUrl = null;
    this.updateError = '';
  }

  getCurrentAvatarUrl(): string {
    const avatar = this.userProfile?.avatar;
    
    // Check for null, undefined, empty string, or "null" string
    if (!avatar || avatar === 'null' || avatar.trim() === '') {
      return '/default-avatar.svg';
    }
    
    return avatar;
  }

  onAvatarImageError(event: any): void {
    // Set fallback avatar when image fails to load (same as posts)
    event.target.src = '/default-avatar.svg';
  }
}
