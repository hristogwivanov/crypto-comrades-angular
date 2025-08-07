import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-edit-holding',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './edit-holding.component.html',
  styleUrls: ['./edit-holding.component.css']
})
export class EditHoldingComponent implements OnInit {
  holdingId: string | null = null;

  constructor(private route: ActivatedRoute) { }

  ngOnInit(): void {
    this.holdingId = this.route.snapshot.paramMap.get('id');
  }

  onSubmit(): void {
    // Logic to update holding
  }

}
