import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GullyBoysComponent } from './gully-boys.component';

describe('GullyBoysComponent', () => {
  let component: GullyBoysComponent;
  let fixture: ComponentFixture<GullyBoysComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GullyBoysComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(GullyBoysComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
