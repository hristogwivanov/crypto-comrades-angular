import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FirebaseUserService } from '../../../services/firebase-user.service';
import { FirebaseAuthService } from '../../../services/firebase-auth.service';
import { UserProfile, UserPreferences, UserPrivacy } from '../../../models/user.interface';
import { Observable } from 'rxjs';

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
  isLoading = false;
  isUpdating = false;
  updateMessage = '';
  updateError = '';

  constructor(
    private fb: FormBuilder,
    private userService: FirebaseUserService,
    private authService: FirebaseAuthService
  ) {
    this.initializeForms();
  }

  ngOnInit(): void {
    this.loadCurrentUser();
  }

  private initializeForms(): void {
    this.profileForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
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
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading user profile:', error);
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
        next: () => {
          this.updateMessage = 'Profile updated successfully!';
          this.isUpdating = false;
          this.loadUserProfile(this.currentUserId!);
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
}
