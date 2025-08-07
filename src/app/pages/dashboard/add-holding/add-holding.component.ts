import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-add-holding',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './add-holding.component.html',
  styleUrls: ['./add-holding.component.css']
})
export class AddHoldingComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

  onSubmit(): void {
    // Logic to add holding
  }

}
