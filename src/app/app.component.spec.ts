import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { AuthService } from './services/auth.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent, HttpClientTestingModule],
      providers: [
        AuthService,
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({}),
            queryParams: of({})
          }
        }
      ]
    }).compileComponents();
  });

  it('should compile components without error', () => {
    expect(true).toBeTruthy();
  });
});
