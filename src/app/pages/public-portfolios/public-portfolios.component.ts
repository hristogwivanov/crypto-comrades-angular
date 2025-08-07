import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-public-portfolios',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './public-portfolios.component.html',
  styleUrls: ['./public-portfolios.component.css']
})
export class PublicPortfoliosComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
